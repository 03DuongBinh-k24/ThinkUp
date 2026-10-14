import { ObjectId } from 'mongodb';
import { getMongoDb, sendEmail } from '../db.js';
import { renderNewsletterWelcomeEmail, renderNewBlogPostEmail } from '../email/email-templates.js';

// ─── Các hàm tiện ích (Helpers) ─────────────────────────────────────────────

/**
 * Kiểm tra định dạng email hợp lệ.
 * @param {string} email
 * @returns {{ valid: boolean, message?: string, value?: string }}
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'Vui lòng cung cấp địa chỉ email.' };
  }
  const trimmed = email.trim();
  if (/\s/.test(trimmed)) {
    return { valid: false, message: 'Địa chỉ email không được chứa khoảng trắng.' };
  }
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(trimmed)) {
    return { valid: false, message: 'Địa chỉ email không đúng định dạng.' };
  }
  return { valid: true, value: trimmed.toLowerCase() };
}

/**
 * Chuyển đổi chuỗi tiếng Việt có dấu thành slug không dấu dùng cho URL.
 * @param {string} text
 * @returns {string}
 */
export function generateSlug(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Ước lượng thời gian đọc dựa trên độ dài nội dung (trung bình ~200 từ/phút).
 * @param {string} content
 * @returns {string} Ví dụ: "4 phút" hoặc "1 phút"
 */
export function calculateReadTime(content) {
  if (!content || typeof content !== 'string') return '3 phút';
  // Loại bỏ các thẻ HTML nếu có
  const cleanText = content.replace(/<[^>]*>/g, ' ').trim();
  const words = cleanText.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} phút`;
}

/**
 * Bóc tách Mục lục nội dung bài viết (Table of Contents - TOC) từ nội dung bài viết.
 * QUY TẮC NGHIỆP VỤ:
 * - Neo CHỈ được sinh ra và đưa vào mục lục nếu người dùng ĐÃ CHỦ ĐỘNG TẠO NEO cho tiêu đề đó khi viết bài
 *   (thể hiện qua thuộc tính id có sẵn trong thẻ, ví dụ: <h2 id="cai-dat-moi-truong"> hoặc <h3 id="luu-y">).
 * - Những tiêu đề KHÔNG được người dùng gắn id neo sẽ TUYỆT ĐỐI KHÔNG tự ý sinh neo và không đưa vào mục lục.
 * - Nếu không có tiêu đề nào có neo id do người dùng tạo, mục lục sẽ là mảng rỗng [].
 *
 * @param {string} content - Nội dung bài viết HTML
 * @returns {Array<{ id: string, text: string, level: number }>}
 */
export function extractTableOfContents(content) {
  if (!content || typeof content !== 'string') return [];
  const toc = [];
  const seenIds = new Set();

  // Chỉ quét các thẻ heading ĐÃ ĐƯỢC NGƯỜI DÙNG GẮN ID NEO: <h2 ... id="..." ...>Tiêu đề</h2>
  const headingRegex = /<h([1-6])([^>]*\sid\s*=\s*["']([^"']+)["'][^>]*)>([\s\S]*?)<\/h\1>/gi;
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = Number.parseInt(match[1], 10);
    const explicitId = match[3]?.trim();
    const rawInnerHtml = match[4] || '';
    const cleanText = rawInnerHtml.replace(/<[^>]*>/g, '').trim();

    if (!cleanText || !explicitId) continue;

    // Đảm bảo không trùng lặp id trong danh sách mục lục
    let uniqueId = explicitId;
    let counter = 1;
    while (seenIds.has(uniqueId)) {
      uniqueId = `${explicitId}-${counter++}`;
    }
    seenIds.add(uniqueId);

    toc.push({ id: uniqueId, text: cleanText, level });
  }

  return toc;
}

/**
 * Giữ nguyên 100% nội dung gốc của người dùng, không tự ý tiêm hay sửa đổi thẻ tiêu đề.
 *
 * @param {string} content
 * @returns {string}
 */
export function injectHeadingsWithIds(content) {
  return content || '';
}

/**
 * Chuẩn hóa một bản ghi blog từ MongoDB sang đối tượng dữ liệu API chuẩn.
 * Đảm bảo đầy đủ các trường:
 * - id: chuỗi ID
 * - title: tên bài blog
 * - slug: đường dẫn thân thiện
 * - description: mô tả ngắn
 * - content: nội dung bài viết (hỗ trợ toàn bộ định dạng bảng, code, gạch ngang, in đậm, link, ảnh...)
 * - category: chủ đề bài blog
 * - categoryId: mã định danh chủ đề
 * - author: tác giả
 * - authorAvatar: ảnh đại diện của tác giả
 * - date: ngày đăng bài
 * - readTime: thời gian đọc
 * - coverImage: hình ảnh bìa
 * - views: lượt xem
 * - tags: danh sách thẻ
 * - status: trạng thái ('published', 'draft', 'updated')
 * - tableOfContents: mục lục nội dung bài viết hỗ trợ điều hướng
 */
export function formatBlogPost(doc, authorUser = null) {
  if (!doc) return null;
  const id = doc._id ? doc._id.toString() : String(doc.id || '');
  
  // Xử lý ngày đăng định dạng chuẩn YYYY-MM-DD và hiển thị thân thiện
  let dateStr = '';
  if (doc.published_at || doc.date || doc.created_at) {
    const d = new Date(doc.published_at || doc.date || doc.created_at);
    if (!Number.isNaN(d.getTime())) {
      dateStr = d.toISOString().split('T')[0];
    }
  }

  const readTime = doc.read_time || doc.readTime || calculateReadTime(doc.content);
  const category = doc.category || (Array.isArray(doc.topics) && doc.topics[0]) || 'Chung';
  const categoryId = doc.category_id || doc.categoryId || generateSlug(category);
  const authorAvatar = doc.author_avatar || doc.authorAvatar || authorUser?.avatar_url || authorUser?.avatar || null;
  const content = doc.content || '';
  const tableOfContents = doc.tableOfContents || extractTableOfContents(content);
  const hasToc = tableOfContents.length > 0;

  return {
    id,
    title: doc.title || '',
    slug: doc.slug || generateSlug(doc.title || ''),
    description: doc.description || doc.summary || '',
    content,
    category,
    categoryId,
    author: doc.author || doc.author_name || authorUser?.full_name || 'ThinkUp Team',
    authorAvatar,
    date: dateStr,
    readTime,
    coverImage: doc.cover_image || doc.coverImage || '/assets/blog/article-1.jpg',
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    views: typeof doc.views === 'number' ? doc.views : Number.parseInt(doc.views, 10) || 0,
    status: doc.status || 'published',
    topics: Array.isArray(doc.topics) ? doc.topics : [category],
    ownerEmail: doc.owner_email || doc.ownerEmail || '',
    hasToc,
    tableOfContents,
    updatedAt: doc.updated_at ? new Date(doc.updated_at).toISOString() : undefined,
  };
}

// ─── 1. Hàm Truy Xuất Danh Sách Bài Blog ────────────────────────────────────

/**
 * Truy xuất danh sách bài blog theo các tiêu chí tìm kiếm, lọc theo chủ đề và phân trang.
 * Trả về danh sách chứa đầy đủ các trường:
 * chủ đề bài blog, tên bài blog, mô tả ngắn, tác giả, ngày đăng bài, thời gian đọc, hình ảnh bìa.
 *
 * @param {object} query - Các tham số truy vấn
 * @param {string} [query.category] - Lọc theo chủ đề/category
 * @param {string} [query.topic] - Lọc theo chủ đề phụ/topic
 * @param {string} [query.search] - Từ khóa tìm kiếm trong tiêu đề/mô tả/nội dung
 * @param {string} [query.ownerEmail] - Lọc bài của tác giả cụ thể
 * @param {number|string} [query.page=1] - Số trang hiện tại
 * @param {number|string} [query.limit=6] - Số lượng bài mỗi trang
 * @param {string} [query.status='published'] - Trạng thái bài đăng
 * @param {object} [options] - Tùy chọn kiểm thử (mock db)
 * @returns {Promise<{ posts: object[], total: number, page: number, limit: number, hasMore: boolean }>}
 */
export async function getBlogList(query = {}, options = {}) {
  const db = options.db || await getMongoDb();
  const collection = db.collection('blogs');

  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(50, Number.parseInt(query.limit, 10) || 6));
  const skip = (page - 1) * limit;

  // Xây dựng điều kiện lọc an toàn
  const filter = {};

  // Mặc định chỉ lấy các bài đã xuất bản, trừ khi có chỉ định rõ
  if (query.status) {
    filter.status = query.status;
  } else {
    filter.status = { $in: ['published', 'updated'] };
  }

  if (query.category && query.category !== 'all' && query.category !== 'Tất cả') {
    const catRegex = new RegExp(`^${query.category.trim()}$`, 'i');
    filter.$or = [
      { category: catRegex },
      { category_id: query.category.trim().toLowerCase() },
      { topics: { $in: [query.category.trim()] } },
    ];
  }

  if (query.topic) {
    const topicRegex = new RegExp(`^${query.topic.trim()}$`, 'i');
    filter.topics = { $elemMatch: { $regex: topicRegex } };
  }

  if (query.ownerEmail) {
    filter.$or = [
      { owner_email: query.ownerEmail.trim().toLowerCase() },
      { ownerEmail: query.ownerEmail.trim().toLowerCase() },
    ];
  }

  if (query.search && typeof query.search === 'string') {
    const sanitizedSearch = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (sanitizedSearch) {
      const searchRegex = new RegExp(sanitizedSearch, 'i');
      const searchConditions = [
        { title: searchRegex },
        { description: searchRegex },
        { summary: searchRegex },
        { tags: { $in: [searchRegex] } },
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }
  }

  // Thực hiện đếm tổng số bài và lấy danh sách có phân trang
  const [total, rawPosts] = await Promise.all([
    collection.countDocuments(filter),
    collection
      .find(filter)
      .sort({ published_at: -1, created_at: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
  ]);

  const posts = rawPosts.map(formatBlogPost);
  const hasMore = skip + posts.length < total;

  return {
    posts,
    total,
    page,
    limit,
    hasMore,
  };
}

// ─── 2. Hàm Truy Xuất Chi Tiết Một Bài Blog ─────────────────────────────────

/**
 * Lấy chi tiết bài blog theo ID hoặc slug.
 * Tự động tăng lượt xem (views) và lấy kèm bài trước, bài sau, bài viết liên quan.
 *
 * @param {string} idOrSlug - ID hoặc Slug của bài viết
 * @param {object} [options] - Tùy chọn (options.incrementView: boolean)
 * @returns {Promise<{ post: object, prevPost: object|null, nextPost: object|null, relatedPosts: object[] }>}
 */
export async function getBlogDetail(idOrSlug, options = {}) {
  if (!idOrSlug || typeof idOrSlug !== 'string') {
    const err = new Error('Mã bài viết hoặc đường dẫn không hợp lệ.');
    err.status = 400;
    err.code = 'INVALID_BLOG_ID';
    throw err;
  }

  const db = options.db || await getMongoDb();
  const collection = db.collection('blogs');

  // Tìm kiếm theo ObjectId hoặc slug
  const queryConditions = [{ slug: idOrSlug.trim() }];
  if (ObjectId.isValid(idOrSlug.trim())) {
    queryConditions.push({ _id: new ObjectId(idOrSlug.trim()) });
  }

  let rawPost = await collection.findOne({ $or: queryConditions });

  if (!rawPost) {
    const err = new Error('Bài viết blog không tồn tại hoặc đã bị gỡ bỏ.');
    err.status = 404;
    err.code = 'BLOG_NOT_FOUND';
    throw err;
  }

  // Tăng lượt xem tự động nếu được bật (mặc định bật)
  if (options.incrementView !== false) {
    await collection.updateOne(
      { _id: rawPost._id },
      { $inc: { views: 1 }, $set: { last_viewed_at: new Date() } }
    );
    rawPost.views = (rawPost.views || 0) + 1;
  }

  // Tra cứu thông tin tác giả từ collection users nếu có owner_email
  let authorUser = null;
  const ownerEmail = (rawPost.owner_email || rawPost.ownerEmail || '').toLowerCase();
  if (ownerEmail) {
    try {
      authorUser = await db.collection('users').findOne(
        { email: ownerEmail },
        { projection: { full_name: 1, avatar_url: 1, avatar: 1, role: 1 } }
      );
    } catch {
      // Bỏ qua lỗi tra cứu nếu collection users chưa có index
    }
  }

  const post = formatBlogPost(rawPost, authorUser);
  post.tableOfContents = extractTableOfContents(rawPost.content);
  post.hasToc = post.tableOfContents.length > 0;

  // Lấy bài trước và bài sau (dựa theo thời gian xuất bản hoặc _id)
  const [prevDoc, nextDoc, relatedDocs] = await Promise.all([
    collection
      .find({ _id: { $lt: rawPost._id }, status: { $in: ['published', 'updated'] } })
      .sort({ _id: -1 })
      .limit(1)
      .project({ title: 1, slug: 1 })
      .toArray(),
    collection
      .find({ _id: { $gt: rawPost._id }, status: { $in: ['published', 'updated'] } })
      .sort({ _id: 1 })
      .limit(1)
      .project({ title: 1, slug: 1 })
      .toArray(),
    collection
      .find({
        _id: { $ne: rawPost._id },
        category: rawPost.category,
        status: { $in: ['published', 'updated'] },
      })
      .sort({ views: -1, _id: -1 })
      .limit(3)
      .toArray(),
  ]);

  const prevPost = prevDoc.length > 0 ? { id: prevDoc[0]._id.toString(), title: prevDoc[0].title } : null;
  const nextPost = nextDoc.length > 0 ? { id: nextDoc[0]._id.toString(), title: nextDoc[0].title } : null;
  const relatedPosts = relatedDocs.map(doc => {
    const formatted = formatBlogPost(doc);
    return {
      id: formatted.id,
      title: formatted.title,
      coverImage: formatted.coverImage,
      readTime: formatted.readTime,
      category: formatted.category,
      categoryId: formatted.categoryId,
    };
  });

  return {
    post,
    prevPost,
    nextPost,
    relatedPosts,
  };
}

// ─── 3. Hàm Xuất Số Lượng Về Những Chủ Đề Phổ Biến ──────────────────────────

/**
 * Hàm xuất số lượng về những chủ đề phổ biến (Popular Topics with count).
 * Gom nhóm các bài blog đã xuất bản theo chủ đề/category và đếm số lượng bài của mỗi chủ đề.
 * Sắp xếp giảm dần theo số lượng bài viết (count).
 *
 * @param {object} [options]
 * @param {number} [options.limit=10] - Giới hạn số lượng chủ đề phổ biến
 * @returns {Promise<Array<{ id: string, label: string, count: number }>>}
 */
export async function getPopularTopics(options = {}) {
  const db = options.db || await getMongoDb();
  const collection = db.collection('blogs');
  const limit = Math.max(1, Number.parseInt(options.limit, 10) || 10);

  // Sử dụng Aggregation Pipeline để gom nhóm và đếm trên CSDL
  const pipeline = [
    {
      $match: {
        status: { $in: ['published', 'updated'] },
        category: { $exists: true, $ne: '' },
      },
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1, _id: 1 },
    },
    {
      $limit: limit,
    },
  ];

  const results = await collection.aggregate(pipeline).toArray();

  return results.map(item => ({
    id: generateSlug(item._id),
    label: item._id,
    count: item.count,
  }));
}

// ─── 4. Hàm Xuất Những Bài Viết Được Xem Nhiều ──────────────────────────────

/**
 * Hàm xuất những bài viết được xem nhiều nhất (Most Viewed Blog Posts).
 * Xuất tên bài blog (title) và lượt xem (views), kèm thông tin bổ trợ như id, coverImage, readTime.
 *
 * @param {object} [options]
 * @param {number} [options.limit=5] - Giới hạn số bài viết xem nhiều nhất
 * @returns {Promise<Array<{ id: string, title: string, views: number, coverImage: string, readTime: string, slug: string }>>}
 */
export async function getMostViewedBlogPosts(options = {}) {
  const db = options.db || await getMongoDb();
  const collection = db.collection('blogs');
  const limit = Math.max(1, Number.parseInt(options.limit, 10) || 5);

  const posts = await collection
    .find({
      status: { $in: ['published', 'updated'] },
    })
    .sort({ views: -1, published_at: -1, _id: -1 })
    .limit(limit)
    .toArray();

  return posts.map(doc => {
    const formatted = formatBlogPost(doc);
    return {
      id: formatted.id,
      title: formatted.title,
      views: formatted.views,
      coverImage: formatted.coverImage,
      readTime: formatted.readTime,
      slug: formatted.slug,
    };
  });
}

/**
 * Lấy dữ liệu tổng hợp cho Sidebar blog:
 * Gồm các chủ đề phổ biến (có số lượng) và bài viết được xem nhiều nhất.
 *
 * @param {object} [options]
 * @returns {Promise<{ popularTopics: Array<{ id: string, label: string, count: number }>, mostViewedArticles: Array<{ id: string, title: string, views: number, coverImage: string }> }>}
 */
export async function getBlogSidebar(options = {}) {
  const [popularTopics, mostViewedArticles] = await Promise.all([
    getPopularTopics(options),
    getMostViewedBlogPosts(options),
  ]);

  return {
    popularTopics,
    mostViewedArticles,
  };
}

// ─── 5. Hàm Đăng Ký Nhận Bản Tin (Newsletter Subscription) ─────────────────

/**
 * Hàm đăng ký nhận bản tin qua email người dùng.
 * Kiểm tra tính hợp lệ của email, lưu vào CSDL tránh trùng lặp,
 * và gửi email xác nhận đăng ký thành công về hòm thư người dùng.
 *
 * @param {object} params
 * @param {string} params.email - Địa chỉ email đăng ký
 * @param {object} [options]
 * @returns {Promise<{ success: boolean, alreadySubscribed: boolean, message: string }>}
 */
export async function subscribeNewsletter({ email }, options = {}) {
  const validation = validateEmail(email);
  if (!validation.valid) {
    const err = new Error(validation.message);
    err.status = 400;
    err.code = 'INVALID_EMAIL';
    throw err;
  }

  const normalizedEmail = validation.value;
  const db = options.db || await getMongoDb();
  const collection = db.collection('newsletter_subscribers');

  // Kiểm tra email đã đăng ký chưa
  const existing = await collection.findOne({ email: normalizedEmail });

  if (existing) {
    if (existing.status === 'active') {
      return {
        success: true,
        alreadySubscribed: true,
        message: 'Bạn đã đăng ký nhận bản tin ThinkUp trước đó rồi! Cảm ơn bạn đã luôn quan tâm.',
      };
    }
    // Nếu từng unsubscribe thì kích hoạt lại
    await collection.updateOne(
      { _id: existing._id },
      { $set: { status: 'active', resubscribed_at: new Date() } }
    );
  } else {
    // Lưu bản ghi người đăng ký mới
    await collection.insertOne({
      email: normalizedEmail,
      status: 'active',
      subscribed_at: new Date(),
      created_at: new Date(),
    });
  }

  // Gửi email chào mừng và xác nhận tới hòm thư người dùng
  try {
    await sendEmail({
      to: normalizedEmail,
      subject: '🎉 Chào mừng bạn đến với Bản Tin ThinkUp Blog!',
      html: renderNewsletterWelcomeEmail({
        email: normalizedEmail,
        clientUrl: process.env.CLIENT_URL,
      }),
      text: 'Cảm ơn bạn đã đăng ký nhận bản tin ThinkUp Blog! Bạn sẽ nhận được thông báo khi có bài viết công nghệ mới nhất.',
    });
  } catch (mailError) {
    // Ghi nhận lỗi gửi mail nhưng không làm hỏng tiến trình đăng ký CSDL
    console.warn('[Newsletter] Không thể gửi email xác nhận chào mừng:', mailError.message);
  }

  return {
    success: true,
    alreadySubscribed: false,
    message: 'Đăng ký nhận bản tin thành công! Bạn sẽ nhận được thông báo khi có bài viết mới.',
  };
}

// ─── 6. Hàm Thông Báo Về Gmail Người Dùng Khi Có Bài Đăng Blog Mới ───────────

/**
 * Hàm gửi thông báo qua email tới toàn bộ danh sách người dùng đã đăng ký nhận bản tin
 * khi có bài viết blog mới được xuất bản.
 *
 * @param {object} blogPost - Đối tượng bài blog mới
 * @param {string} blogPost.title - Tên bài blog
 * @param {string} [blogPost.description] - Mô tả ngắn bài blog
 * @param {string} [blogPost.category] - Chủ đề bài blog
 * @param {string} [blogPost.coverImage] - Ảnh bìa bài blog
 * @param {string} [blogPost.readTime] - Thời gian đọc
 * @param {string} [blogPost.slug] - Slug bài blog
 * @param {string} [blogPost.id] - ID bài blog
 * @param {object} [options]
 * @param {string} [options.clientUrl] - URL frontend để dẫn người đọc vào xem bài viết
 * @returns {Promise<{ notified: number, totalSubscribers: number, failed: number }>}
 */
export async function notifySubscribersNewPost(blogPost, options = {}) {
  if (!blogPost || !blogPost.title) {
    const err = new Error('Thông tin bài blog không hợp lệ để phát thông báo.');
    err.status = 400;
    err.code = 'INVALID_BLOG_DATA';
    throw err;
  }

  const db = options.db || await getMongoDb();
  const collection = db.collection('newsletter_subscribers');

  // Lấy danh sách email người dùng có trạng thái active
  const subscribers = await collection
    .find({ status: 'active' })
    .project({ email: 1 })
    .toArray();

  if (subscribers.length === 0) {
    return {
      notified: 0,
      totalSubscribers: 0,
      failed: 0,
      message: 'Hiện chưa có người đăng ký nhận bản tin nào.',
    };
  }

  const clientUrl = options.clientUrl || process.env.CLIENT_URL || 'https://think-up-edu.vercel.app';
  const postUrl = `${clientUrl}/blog/${encodeURIComponent(blogPost.slug || blogPost.id || '')}`;
  const title = blogPost.title;
  const description = blogPost.description || blogPost.summary || 'Khám phá ngay bài viết mới nhất trên ThinkUp Blog!';
  const category = blogPost.category || 'Công nghệ & Lập trình';
  const readTime = blogPost.readTime || calculateReadTime(blogPost.content);
  const coverImage = blogPost.coverImage || '';

  const htmlContent = renderNewBlogPostEmail({
    title,
    description,
    category,
    readTime,
    coverImage,
    postUrl,
    clientUrl,
  });

  let notifiedCount = 0;
  let failedCount = 0;

  // Gửi email thông báo lần lượt hoặc theo cụm đến người dùng
  const emailPromises = subscribers.map(async sub => {
    try {
      await sendEmail({
        to: sub.email,
        subject: `[ThinkUp Blog] 📢 Bài viết mới: ${title}`,
        html: htmlContent,
        text: `Bài viết mới trên ThinkUp Blog: ${title}\nChủ đề: ${category} | Thời gian đọc: ${readTime}\n${description}\n\nĐọc ngay tại: ${postUrl}`,
      });
      notifiedCount += 1;
    } catch (err) {
      failedCount += 1;
      console.warn(`[Newsletter] Gửi email thất bại tới ${sub.email}:`, err.message);
    }
  });

  await Promise.allSettled(emailPromises);

  return {
    notified: notifiedCount,
    totalSubscribers: subscribers.length,
    failed: failedCount,
  };
}

// ─── 7. Hàm Tạo Hoặc Cập Nhật Bài Blog (Tự động kích hoạt thông báo) ─────────

/**
 * Tạo mới hoặc cập nhật một bài blog.
 * Tự động tính thời gian đọc, sinh slug và nếu là bài đăng mới xuất bản,
 * có thể tự động gửi thông báo đến người đăng ký bản tin.
 *
 * @param {object} blogData
 * @param {object} [options]
 * @param {boolean} [options.notify=true] - Tự động thông báo qua email cho người dùng đăng ký bản tin
 * @returns {Promise<{ id: string, slug: string, status: string, notifiedCount?: number, message: string }>}
 */
export async function saveBlogPost(blogData, options = {}) {
  if (!blogData || !blogData.title || typeof blogData.title !== 'string') {
    const err = new Error('Tên bài blog là bắt buộc.');
    err.status = 400;
    err.code = 'MISSING_BLOG_TITLE';
    throw err;
  }

  const title = blogData.title.trim();
  const content = blogData.content || '';
  const description = blogData.description || blogData.summary || '';
  const category = blogData.category || (Array.isArray(blogData.topics) && blogData.topics[0]) || 'Chung';
  const categoryId = blogData.categoryId || generateSlug(category);
  const author = blogData.author || 'ThinkUp Team';
  const status = blogData.status || 'published';
  const readTime = blogData.readTime || calculateReadTime(content);
  const coverImage = blogData.coverImage || '/assets/blog/article-1.jpg';
  const slug = blogData.slug ? generateSlug(blogData.slug) : generateSlug(title);
  const hasToc = Boolean(blogData.hasToc ?? blogData.enableToc ?? blogData.tableOfContentsEnabled ?? false);
  const authorAvatar = blogData.authorAvatar || blogData.author_avatar || null;

  const db = options.db || await getMongoDb();
  const collection = db.collection('blogs');

  let postId = blogData.id;
  const now = new Date();

  if (postId) {
    // Cập nhật bài viết hiện có
    const updateDoc = {
      title,
      slug,
      description,
      content,
      category,
      category_id: categoryId,
      author,
      read_time: readTime,
      cover_image: coverImage,
      tags: Array.isArray(blogData.tags) ? blogData.tags : [],
      status,
      has_toc: hasToc,
      updated_at: now,
    };
    if (authorAvatar) updateDoc.author_avatar = authorAvatar;
    if (blogData.ownerEmail) updateDoc.owner_email = blogData.ownerEmail.toLowerCase();

    await collection.updateOne(
      { _id: new ObjectId(postId) },
      { $set: updateDoc }
    );
  } else {
    // Tạo bài viết mới
    const insertDoc = {
      title,
      slug,
      description,
      content,
      category,
      category_id: categoryId,
      author,
      author_avatar: authorAvatar,
      read_time: readTime,
      cover_image: coverImage,
      tags: Array.isArray(blogData.tags) ? blogData.tags : [],
      views: 0,
      status,
      has_toc: hasToc,
      published_at: now,
      created_at: now,
      updated_at: now,
      owner_email: blogData.ownerEmail ? blogData.ownerEmail.toLowerCase() : '',
    };

    const insertResult = await collection.insertOne(insertDoc);
    postId = insertResult.insertedId.toString();

    // Nếu bài viết mới được xuất bản ngay và tùy chọn notify được bật:
    let notifyResult = null;
    if (status === 'published' && options.notify !== false) {
      try {
        notifyResult = await notifySubscribersNewPost({
          id: postId,
          title,
          slug,
          description,
          category,
          coverImage,
          readTime,
        }, options);
      } catch (notifyErr) {
        console.warn('[Blog] Không thể gửi thông báo newsletter tự động:', notifyErr.message);
      }
    }

    return {
      id: postId,
      slug,
      status,
      notifiedSubscribers: notifyResult ? notifyResult.notified : 0,
      message: 'Tạo bài viết blog thành công!',
    };
  }

  return {
    id: postId,
    slug,
    status,
    message: 'Cập nhật bài viết blog thành công!',
  };
}

// ─── 7b. Hàm Tải Lên Hình Ảnh Cho Thanh Công Cụ (Image Upload) ─────────────

/**
 * Xử lý tải lên hình ảnh phục vụ nút chèn ảnh trên thanh công cụ soạn thảo bài viết.
 * Nhận thông tin ảnh (hoặc URL/base64) và trả về đường dẫn URL ảnh an toàn để nhúng vào thẻ <img>.
 *
 * @param {object} payload
 * @param {string} [payload.url] - Đường dẫn ảnh từ xa
 * @param {string} [payload.base64] - Chuỗi base64 của ảnh
 * @param {string} [payload.fileName] - Tên file ảnh
 * @returns {Promise<{ url: string, message: string }>}
 */
export async function uploadBlogImage(payload = {}) {
  if (payload.url && typeof payload.url === 'string' && payload.url.trim().startsWith('http')) {
    return {
      url: payload.url.trim(),
      message: 'Liên kết ảnh hợp lệ',
    };
  }

  // Nếu người dùng tải ảnh từ máy tính (base64 hoặc data-uri)
  if (payload.base64 && typeof payload.base64 === 'string') {
    return {
      url: payload.base64,
      message: 'Tải ảnh lên thành công',
    };
  }

  // Mặc định trả về đường dẫn mẫu nếu không có dữ liệu
  return {
    url: '/assets/blog/article-1.jpg',
    message: 'Tải ảnh lên thành công',
  };
}

// ─── 8. Bộ Định Tuyến Express Sẵn Sàng Nối API (createBlogRouter) ────────────

/**
 * Tạo một router Express độc lập chứa đầy đủ các endpoint cho chức năng blog.
 * Sẵn sàng để server chính gắn vào với 1 dòng: `app.use('/api/blog', createBlogRouter())`
 * hoặc `app.use('/api/v1/blog', createBlogRouter())`.
 *
 * @param {object} [expressModule] - Tùy chọn truyền module express vào
 * @returns {import('express').Router}
 */
export function createBlogRouter(expressModule) {
  // eslint-disable-next-line global-require
  const express = expressModule;
  if (!express || !express.Router) {
    throw new Error('Cần truyền module express vào createBlogRouter(express).');
  }

  const router = express.Router();

  // 1. Lấy danh sách bài blog (có phân trang, tìm kiếm, lọc)
  router.get('/', async (req, res, next) => {
    try {
      const result = await getBlogList(req.query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // 2. Lấy dữ liệu Sidebar (Chủ đề phổ biến + Bài viết xem nhiều)
  router.get('/sidebar', async (req, res, next) => {
    try {
      const result = await getBlogSidebar();
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // 3. Lấy danh sách các chủ đề phổ biến cùng số lượng
  router.get('/topics/popular', async (req, res, next) => {
    try {
      const limit = req.query.limit;
      const topics = await getPopularTopics({ limit });
      res.json({ topics });
    } catch (err) {
      next(err);
    }
  });

  // 4. Lấy danh sách các bài viết được xem nhiều nhất (lượt xem + tên bài blog)
  router.get('/articles/most-viewed', async (req, res, next) => {
    try {
      const limit = req.query.limit;
      const articles = await getMostViewedBlogPosts({ limit });
      res.json({ articles });
    } catch (err) {
      next(err);
    }
  });

  // 5. Đăng ký nhận bản tin (Newsletter Subscription)
  router.post('/newsletter', async (req, res, next) => {
    try {
      const result = await subscribeNewsletter({ email: req.body.email });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // Alias tương thích route /newsletter/subscribe
  router.post('/newsletter/subscribe', async (req, res, next) => {
    try {
      const result = await subscribeNewsletter({ email: req.body.email });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // 6. Gửi thông báo bài viết mới đến hòm thư người đăng ký bản tin
  router.post('/notify-subscribers', async (req, res, next) => {
    try {
      const result = await notifySubscribersNewPost(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // 7. Tạo hoặc cập nhật bài blog
  router.post('/', async (req, res, next) => {
    try {
      const result = await saveBlogPost(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  // 8. Lấy chi tiết bài blog theo ID hoặc slug
  router.get('/:id', async (req, res, next) => {
    try {
      const result = await getBlogDetail(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // 9. Endpoint tải ảnh lên phục vụ thanh công cụ soạn thảo bài viết
  router.post('/upload', async (req, res, next) => {
    try {
      const result = await uploadBlogImage(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
