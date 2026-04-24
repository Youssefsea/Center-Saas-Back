const pool = require('../Clouds/Data');
const jwt = require('jsonwebtoken');
const { extractYouTubeId, extractDriveId, detectUrlType } = require('../Middelware/contentSecCheck');
const sendError = (res, status, code, message, meta = {}) =>
    res.status(status).json({ success: false, error: { code, message, ...meta } }); // ✅ FIXED: normalized error response shape

const joinRoom = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { accessCode } = req.body;

        if (!accessCode) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Access code is required');
        }

        const roomResult = await pool.query(
            `SELECT id, name, is_active FROM rooms WHERE access_code = $1`,
            [accessCode]
        );

        if (roomResult.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Invalid access code');
        }

        const room = roomResult.rows[0];

        if (!room.is_active) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'This room is no longer active');
        }

        const existingMember = await pool.query(
            `SELECT id, is_active FROM room_members WHERE room_id = $1 AND student_id = $2`,
            [room.id, studentId]
        );

        if (existingMember.rows.length > 0) {
            if (!existingMember.rows[0].is_active) {
                await pool.query(
                    `UPDATE room_members SET is_active = true, joined_at = NOW() WHERE room_id = $1 AND student_id = $2`,
                    [room.id, studentId]
                );
                return res.status(200).json({
                    success: true,
                    message: 'Rejoined room successfully',
                    room: { id: room.id, name: room.name, access_tier: existingMember.rows[0].access_tier }
                });
            }
            return sendError(res, 400, 'VALIDATION_ERROR', 'You are already a member of this room');
        }

        await pool.query(
            `INSERT INTO room_members (room_id, student_id, access_tier)
             VALUES ($1, $2, 'free')`,
            [room.id, studentId]
        );

        await pool.query(
            `UPDATE rooms SET member_count = member_count + 1 WHERE id = $1`,
            [room.id]
        );

        res.status(200).json({
            success: true,
            message: 'Joined room successfully',
            room: {
                id: room.id,
                name: room.name,
                access_tier: 'free'
            }
        });

    } catch (err) {
        console.error('Error joining room:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const getMyRooms = async (req, res) => {
    try {
        const studentId = req.user.id;

        const result = await pool.query(
            `SELECT 
                r.id ,
                r.name,
                r.description,
                r.subject,
                r.grade_level,
                r.is_active,
                
                rm.access_tier,
                rm.joined_at,
                u.name AS teacher_name,
                u.avatar_url AS teacher_avatar
            FROM room_members rm
            JOIN rooms r ON r.id = rm.room_id
            JOIN teachers t ON t.id = r.teacher_id
            JOIN users u ON u.id = t.user_id
            WHERE rm.student_id = $1
              AND rm.is_active = true
            ORDER BY rm.joined_at DESC`,
            [studentId]
        );


        let rooms = result.rows.map(room => ({
            id: room.id,
            name: room.name,
            description: room.description,
            subject: room.subject,
            grade_level: room.grade_level,
            is_active: room.is_active,
            access_tier: room.access_tier,
            joined_at: room.joined_at,
            teacher: {
                name: room.teacher_name,
                avatar_url: room.teacher_avatar
            }
        }));

        const contentCountsResult = await pool.query(
            `SELECT room_id, COUNT(*) AS content_count 
             FROM content_items
                WHERE room_id = ANY($1)
                GROUP BY room_id`,
            [rooms.map(r => r.id)]
        );
        const contentCounts = {};
        contentCountsResult.rows.forEach(row => {
            contentCounts[row.room_id] = parseInt(row.content_count);
        });
    
        rooms = rooms.map(room => ({
            ...room,
            content_count: contentCounts[room.id] || 0
        }));



        res.status(200).json({
            success: true,
            rooms: rooms
        });

    } catch (err) {
        console.error('Error fetching rooms:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const getRoomContent = async (req, res) => {
    try {
        const studentId = req.user.id;
        const roomId = req.params.roomId;

        const memberResult = await pool.query(
            `SELECT access_tier FROM room_members 
             WHERE room_id = $1 AND student_id = $2 AND is_active = true`,
            [roomId, studentId]
        );

        if (memberResult.rows.length === 0) {
            return sendError(res, 403, 'CONTENT_ACCESS_DENIED', 'You are not a member of this room');
        }

        const accessTier = memberResult.rows[0].access_tier;

        

        const result = await pool.query(
            `SELECT 
                ci.id AS content_id,
                ci.type,
                ci.title,
                ci.description,
                ci.is_free,
                ci.sort_order,
                ci.duration_seconds,
                ci.view_count,
                ci.created_at,
                CASE 
                    WHEN ci.is_free = true OR $2 = 'paid' THEN ci.url
                    ELSE NULL
                END AS url,
                CASE 
                    WHEN ci.is_free = true OR $2 = 'paid' THEN ci.thumbnail_url
                    ELSE NULL
                END AS thumbnail_url
            FROM content_items ci
            JOIN rooms r ON r.id = ci.room_id
            WHERE r.id = $1 AND r.is_active = true
            ORDER BY ci.sort_order ASC, ci.created_at ASC`,
            [roomId, accessTier]
        );


        const infoOfRoom = await pool.query(
            `SELECT r.name, r.description, r.grade_level, r.subject, u.name AS teacher_name, r.paid_price
             FROM rooms r
             JOIN teachers t ON t.id = r.teacher_id
             JOIN users u ON u.id = t.user_id
             WHERE r.id = $1`,
            [roomId]
        );

        const roomInfo = infoOfRoom.rows[0] || {};

        res.status(200).json({
            success: true,
            access_tier: accessTier,
            room: {
                name: roomInfo.name,
                description: roomInfo.description,
                grade_level: roomInfo.grade_level,
                subject: roomInfo.subject,
                teacher_name: roomInfo.teacher_name,
                paid_price: roomInfo.paid_price
            },
            content: result.rows
        });

    } catch (err) {
        console.error('Error fetching room content:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const upgradeRoomAccess = async (req, res) => {
    const client = await pool.connect();
    try {
        const studentId = req.user.id;
        const roomId = req.params.roomId;

        await client.query('BEGIN');

        const memberResult = await client.query(
            `SELECT id, access_tier FROM room_members 
             WHERE room_id = $1 AND student_id = $2 AND is_active = true`,
            [roomId, studentId]
        );

        if (memberResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return sendError(res, 403, 'FORBIDDEN', 'You are not a member of this room');
        }

        if (memberResult.rows[0].access_tier === 'paid') {
            await client.query('ROLLBACK');
            return sendError(res, 400, 'VALIDATION_ERROR', 'You already have paid access');
        }

        const roomResult = await client.query(
            `SELECT paid_price FROM rooms WHERE id = $1`,
            [roomId]
        );

        const roomPrice = parseFloat(roomResult.rows[0]?.paid_price);

        if (!roomPrice || roomPrice <= 0) {
            await client.query('ROLLBACK');
            return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid room price configuration');
        }

        const balanceResult = await client.query(
            `SELECT COALESCE(
                SUM(CASE 
                    WHEN type IN ('deposit', 'refund') AND status = 'completed' THEN amount
                    WHEN type IN ('withdrawal', 'booking_charge') AND status = 'completed' THEN -amount
                    ELSE 0
                END), 0
            ) AS balance
            FROM wallet_transactions WHERE user_id = $1`,
            [studentId]
        );

        const balance = parseFloat(balanceResult.rows[0].balance);

        if (balance < roomPrice) {
            await client.query('ROLLBACK');
            return sendError(res, 400, 'INSUFFICIENT_BALANCE', 'Insufficient wallet balance', {
                required: roomPrice,
                available: balance
            });
        }

        await client.query(
            `UPDATE room_members SET access_tier = 'paid' WHERE room_id = $1 AND student_id = $2`,
            [roomId, studentId]
        );

        await client.query(
            `INSERT INTO wallet_transactions 
             (user_id, amount, type, status, reference_id, reference_type, description, completed_at)
             VALUES ($1, $2, 'booking_charge', 'completed', $3, 'room_upgrade', 'Room premium access upgrade', NOW())`,
            [studentId, roomPrice, roomId]
        );

        await client.query('COMMIT');

        res.status(200).json({
            success: true,
            message: 'Room access upgraded to paid tier',
            amount_charged: roomPrice,
            remaining_balance: balance - roomPrice
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error upgrading room access:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    } finally {
        client.release();
    }
};

const getContentToken = async (req, res) => {
  try {
    // ✅ من query مش params
    const { contentId } = req.query
    const userId = req.user.id

    if (!contentId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'contentId مطلوب' }
      })
    }

    const result = await pool.query(`
      SELECT 
        ci.id,
        ci.type,
        ci.is_free,
        ci.room_id,
        COALESCE(tc.url, ci.url) AS url,
        rm.access_tier,
        rm.is_active AS member_active
      FROM content_items ci
      LEFT JOIN teacher_content tc 
        ON tc.id = ci.teacher_content_id
      LEFT JOIN room_members rm 
        ON rm.room_id = ci.room_id 
        AND rm.student_id = $2
        AND rm.is_active = true
      WHERE ci.id = $1
    `, [contentId, userId])

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'المحتوى مش موجود' }
      })
    }

    const content = result.rows[0]

    if (!content.member_active) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_A_MEMBER', message: 'مش عضو في الـ Room دي' }
      })
    }

    if (!content.is_free && content.access_tier !== 'paid') {
      return res.status(403).json({
        success: false,
        error: { 
          code: 'UPGRADE_REQUIRED', 
          message: 'المحتوى ده للأعضاء المدفوعين بس' 
        }
      })
    }

    if (!content.url) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_URL', message: 'المحتوى ده مش متاح' }
      })
    }

    const urlType = detectUrlType(content.url, content.type)

    const token = jwt.sign(
      {
        contentId,
        type: content.type,
        urlType,
        url: content.url,
        userId,
      },
      process.env.JWT_SECRET,
      { expiresIn: '4h' }
    )

    res.json({ success: true, token, urlType })

  } catch (err) {
    console.error(err)
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Internal server error' }
    })
  }
}

const streamContent = async (req, res) => {
  try {
    const { token } = req.query

    if (!token) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_TOKEN', message: 'التوكن مش موجود' }
      })
    }

    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: { 
          code: 'TOKEN_EXPIRED', 
          message: 'انتهت صلاحية الجلسة، افتح المحتوى تاني' 
        }
      })
    }

    if (decoded.urlType === 'youtube') {
      const videoId = extractYouTubeId(decoded.url)
      if (!videoId) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_URL', message: 'رابط YouTube غلط' }
        })
      }
      return res.json({ 
        success: true, 
        type: 'youtube',
        videoId
      })
    }

    if (decoded.urlType === 'google_drive') {
      const fileId = extractDriveId(decoded.url)
      if (!fileId) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_URL', message: 'رابط Drive غلط' }
        })
      }
      const embedUrl = 
        `https://drive.google.com/file/d/${fileId}/preview`
      return res.json({ 
        success: true, 
        type: 'google_drive',
        embedUrl
      })
    }

    if (decoded.urlType === 'direct_pdf') {
      const fetch = (await import('node-fetch')).default
      const response = await fetch(decoded.url)
      
      if (!response.ok) {
        return res.status(502).json({
          success: false,
          error: { code: 'FETCH_ERROR', message: 'مش قادر يجيب الملف' }
        })
      }

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', 'inline')
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      res.setHeader('Pragma', 'no-cache')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('X-Frame-Options', 'SAMEORIGIN')
      
      response.body.pipe(res)
      return
    }

    if (decoded.urlType === 'external_link') {
      return res.json({ 
        success: true, 
        type: 'external_link',
        url: decoded.url
      })
    }

    return res.status(400).json({
      success: false,
      error: { code: 'UNKNOWN_TYPE', message: 'نوع المحتوى مش معروف' }
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Internal server error' }
    })
  }
}



module.exports = {
    joinRoom,
    getMyRooms,
    getRoomContent,
    upgradeRoomAccess,
    getContentToken,
    streamContent
};
