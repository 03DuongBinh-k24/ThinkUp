import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../../.env'), quiet: true });
const { getMongoDb, closeMongoDb } = await import('../src/user/db.js');
const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret } = process.env;
if (!cloud || !key || !secret) throw new Error('Missing Cloudinary configuration.');

const dir = path.join(here, 'sign');
const folder = 'thinkup_instructors/signatures';
const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
const files = fs.readdirSync(dir).filter(file => mime[path.extname(file).slice(1).toLowerCase()]);
const db = await getMongoDb();

try {
  const profiles = await db.collection('instructor_profiles').find({}).toArray();
  const courses = await db.collection('courses').find({}, { projection: { instructor_id: 1, instructorId: 1 } }).toArray();
  const courseInstructorIds = new Set(courses.flatMap(course => [course.instructor_id, course.instructorId]
    .filter(value => value != null).map(String)));
  const profileByInstructor = new Map();
  for (const profile of profiles) {
    for (const id of [profile.instructor_id, profile.user_id, profile.id]) {
      if (id != null) profileByInstructor.set(String(id).toLowerCase(), profile);
    }
  }

  const plan = [];
  const problems = [];
  for (const file of files) {
    const basename = path.basename(file, path.extname(file)).toLowerCase();
    const profile = profileByInstructor.get(basename);
    if (!profile) { problems.push(`${file}: no matching instructor profile`); continue; }
    const instructorId = basename;
    if (!courseInstructorIds.has(instructorId)) { problems.push(`${file}: instructor has no course`); continue; }
    plan.push({ file, profile, instructorId, name: profile.full_name || profile.name || instructorId });
  }

  const missing = [...courseInstructorIds].filter(id => !profileByInstructor.has(id.toLowerCase())
    || !files.some(file => path.basename(file, path.extname(file)).toLowerCase() === id.toLowerCase()));
  console.log(JSON.stringify({
    planned: plan.map(item => ({ file: item.file, instructor: item.name, instructorId: item.instructorId })),
    instructorsMissingSignature: missing,
    problems,
    mode: process.argv.includes('--apply') ? 'apply' : 'dry-run',
  }, null, 2));
  if (process.argv.includes('--verify')) {
    const signed = profiles.filter(profile => profile.signature_url || profile.signatureUrl);
    const checks = await Promise.all(signed.map(async profile => {
      const url = profile.signature_url || profile.signatureUrl;
      try {
        const response = await fetch(url, { method: 'HEAD' });
        return { instructor: profile.full_name || profile.name || String(profile.instructor_id || profile.user_id),
          url, status: response.status, ok: response.ok };
      } catch (error) {
        return { instructor: profile.full_name || profile.name || String(profile.instructor_id || profile.user_id),
          url, ok: false, error: error.message };
      }
    }));
    console.log(JSON.stringify({ verified: checks.filter(check => check.ok).length,
      failed: checks.filter(check => !check.ok).length, checks }, null, 2));
    if (checks.some(check => !check.ok)) process.exitCode = 1;
  }
  if (problems.length) throw new Error('Signature mapping has unresolved files.');
  if (!process.argv.includes('--apply') || process.argv.includes('--verify')) process.exitCode ||= 0;
  else {
    const failures = [];
    const uploadedUrls = new Map();
    for (const item of plan) {
      try {
        const timestamp = Math.floor(Date.now() / 1000);
        const params = { folder, overwrite: 'true', public_id: item.instructorId, timestamp };
        const toSign = Object.keys(params).sort().map(name => `${name}=${params[name]}`).join('&');
        const form = new FormData();
        for (const [name, value] of Object.entries(params)) form.append(name, String(value));
        form.append('api_key', key);
        form.append('signature', crypto.createHash('sha1').update(toSign + secret).digest('hex'));
        const ext = path.extname(item.file).slice(1).toLowerCase();
        form.append('file', new Blob([fs.readFileSync(path.join(dir, item.file))], { type: mime[ext] }), item.file);
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: form });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.secure_url) throw new Error(result.error?.message || `Cloudinary returned ${response.status}`);
        await db.collection('instructor_profiles').updateOne({ _id: item.profile._id }, { $set: {
          signature_url: result.secure_url,
          signature_public_id: result.public_id,
          updated_at: new Date(),
        } });
        uploadedUrls.set(String(item.profile._id), result.secure_url);
        console.log(`Uploaded ${item.file} for ${item.name}`);
      } catch (error) { failures.push(`${item.file} (${item.name}): ${error.message}`); }
    }

    if (failures.length) {
      console.error(failures.join('\n'));
      process.exitCode = 1;
    } else {
      // Refresh URLs on already issued certificates so existing downloads and verification views show signatures too.
      const signedProfiles = profiles.filter(profile => plan.some(item => String(item.profile._id) === String(profile._id)));
      let refreshed = 0;
      for (const profile of signedProfiles) {
        const ids = [profile.instructor_id, profile.user_id, profile.id].filter(value => value != null).map(String);
        if (!ids.length) continue;
        const updated = await db.collection('certificates').updateMany({
          instructor_id: { $in: ids },
          $or: [{ signature_url: null }, { signature_url: { $exists: false } }, { signature_url: '' }],
        }, { $set: { signature_url: uploadedUrls.get(String(profile._id)) } });
        refreshed += updated.modifiedCount;
      }
      console.log(`Uploaded ${plan.length} signatures; refreshed ${refreshed} issued certificates.`);
    }
  }
} finally { await closeMongoDb(); }
