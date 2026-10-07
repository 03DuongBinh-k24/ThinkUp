import mysql from 'mysql2/promise';
import { getMysqlConfig } from '../../../src/lib/mysql-config.js';

// ─── Connection Pool ──────────────────────────────────────────────────────────

let _pool = global.serverDbPool || null;

/**
 * Lấy MySQL connection pool (singleton).
 * @returns {Promise<mysql.Pool>}
 */
export async function getPool() {
  if (_pool) return _pool;

  _pool = mysql.createPool(getMysqlConfig());
  global.serverDbPool = _pool;

  await initializeTables();

  return _pool;
}

// ─── Schema Migration ─────────────────────────────────────────────────────────

async function initializeTables() {
  const connection = await _pool.getConnection();
  try {
    // ── Rooms ──────────────────────────────────────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        roomId        VARCHAR(255) UNIQUE NOT NULL,
        name          VARCHAR(255) NOT NULL,
        type          ENUM('public','private') DEFAULT 'public',
        password      VARCHAR(255),
        maxUsers      INT DEFAULT 20,
        currentUsers  INT DEFAULT 0,
        status        ENUM('idle','active','full') DEFAULT 'idle',
        tags          TEXT,
        category      VARCHAR(100) DEFAULT 'General Study',
        language      VARCHAR(50)  DEFAULT 'Vietnamese',
        template      VARCHAR(100) DEFAULT 'study-group',
        theme         VARCHAR(100) DEFAULT 'minimal',
        description   TEXT,
        inviteMode    VARCHAR(50)  DEFAULT 'link',
        approvalRequired TINYINT(1) DEFAULT 0,
        rating        DECIMAL(2,1),
        waitlistCount INT DEFAULT 0,
        hostId        VARCHAR(255) DEFAULT NULL,
        createdAt     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // ── Widgets ────────────────────────────────────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS widgets (
        id        INT AUTO_INCREMENT PRIMARY KEY,
        roomId    VARCHAR(255) NOT NULL,
        widgetId  VARCHAR(255) UNIQUE NOT NULL,
        type      VARCHAR(50) NOT NULL,
        x         DOUBLE DEFAULT 0,
        y         DOUBLE DEFAULT 0,
        z         INT DEFAULT 0,
        w         DOUBLE,
        h         DOUBLE,
        content   TEXT,
        color     VARCHAR(50),
        label     VARCHAR(255),
        url       VARCHAR(500),
        streamId  VARCHAR(255),
        ownerId   VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE
      )
    `);

    // ── Room Join Requests ─────────────────────────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS room_join_requests (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        requestId     VARCHAR(255) UNIQUE NOT NULL,
        roomId        VARCHAR(255) NOT NULL,
        requesterId   VARCHAR(255) NOT NULL,
        requesterName VARCHAR(255) NOT NULL,
        note          TEXT,
        status        ENUM('pending','approved','rejected') DEFAULT 'pending',
        createdAt     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE
      )
    `);

    // ── Users ──────────────────────────────────────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id                    INT AUTO_INCREMENT PRIMARY KEY,
        full_name             VARCHAR(255) NOT NULL,
        email                 VARCHAR(255) UNIQUE NOT NULL,
        phone                 VARCHAR(20)  UNIQUE DEFAULT NULL,
        password_hash         VARCHAR(255) DEFAULT NULL,
        provider              ENUM('local','google','facebook') DEFAULT 'local',
        provider_id           VARCHAR(255) DEFAULT NULL,
        status                ENUM('pending','active','locked') DEFAULT 'pending',
        failed_login_attempts INT DEFAULT 0,
        locked_until          TIMESTAMP NULL DEFAULT NULL,
        role                  ENUM('student','instructor','admin') DEFAULT 'student',
        avatar_url            VARCHAR(500) DEFAULT NULL,
        email_verified_at     TIMESTAMP NULL DEFAULT NULL,
        created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // ── OTP Codes ──────────────────────────────────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        email      VARCHAR(255) NOT NULL,
        code       VARCHAR(6)   NOT NULL,
        purpose    ENUM('register','reset_password') NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used       TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_otp_email_purpose (email, purpose)
      )
    `);

    // ── Instructor Profiles ────────────────────────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS instructor_profiles (
        id                      INT AUTO_INCREMENT PRIMARY KEY,
        user_id                 INT UNIQUE NOT NULL,
        title                   VARCHAR(255),
        bio                     TEXT,
        website                 VARCHAR(500),
        facebook                VARCHAR(500),
        youtube                 VARCHAR(500),
        instagram               VARCHAR(500),
        payout_method           ENUM('bank','paypal') DEFAULT 'bank',
        bank_name               VARCHAR(255),
        bank_account_name       VARCHAR(255),
        bank_account_number     VARCHAR(100),
        bank_branch             VARCHAR(255),
        paypal_email            VARCHAR(255),
        auto_payout_threshold   INT DEFAULT 5000000,
        auto_payout_enabled     TINYINT(1) DEFAULT 1,
        created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('[MySQL] Database tables initialized.');
  } catch (error) {
    console.error('[MySQL] Table initialization error:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}
