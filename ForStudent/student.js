const pool=require('../Clouds/Data');
const uuid = require('uuid');
const sendError = (res, status, code, message, meta = {}) =>
    res.status(status).json({ success: false, error: { code, message, ...meta } }); // ✅ FIXED: normalized error response shape




const getNearbyCenters = async (req, res) => {
    try {
        const lat = parseFloat(req.query.lat);
        const lng = parseFloat(req.query.lng);
        const radius = parseFloat(req.query.radius) || 10; // km
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        if (isNaN(lat) || isNaN(lng)) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Valid latitude and longitude are required');
        }

        const radiusMeters = radius * 1000;

        const query = `
            SELECT 
                id, name, address, description, phone, logo_url, is_active,
                ST_Distance(coordinates, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) / 1000 AS distance_km
            FROM centers
            WHERE is_active = TRUE
              AND ST_DWithin(coordinates, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
            ORDER BY distance_km ASC
            LIMIT $4 OFFSET $5
        `;

        const countQuery = `
            SELECT COUNT(*) FROM centers 
            WHERE is_active = TRUE
              AND ST_DWithin(coordinates, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
        `;

        const [centersResult, countResult] = await Promise.all([
            pool.query(query, [lat, lng, radiusMeters, limit, offset]),
            pool.query(countQuery, [lat, lng, radiusMeters])
        ]);

        res.status(200).json({ 
            success: true,
            centers: centersResult.rows,
            pagination: {
                page,
                limit,
                total: parseInt(countResult.rows[0].count)
            }
        });
    } catch (err) {
        console.error('Error fetching nearby centers:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};


const getNearbyCentersWithTeachers = async (req, res) => {
    try {
        const lat = parseFloat(req.query.lat);
        const lng = parseFloat(req.query.lng);
        const radius = parseFloat(req.query.radius) || 10;
        const subject = req.query.subject;
        const grade_level = req.query.grade_level;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
    

        if (isNaN(lat) || isNaN(lng)) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Valid latitude and longitude are required');
        }

        const radiusMeters = radius * 1000;

        let query = `
            SELECT 
                t.id AS teacher_id,
                u.name AS teacher_name,
                u.avatar_url,
                t.subjects,
                t.grade_levels,
                t.rating,
                t.total_reviews,
                c.id AS center_id,
                c.name AS center_name,
                c.address AS center_address,
                ST_Distance(c.coordinates, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) / 1000 AS distance_km
            FROM teachers t
            JOIN users u ON u.id = t.user_id
            JOIN center_teachers ct ON ct.teacher_id = t.id AND ct.is_active = TRUE
            JOIN centers c ON c.id = ct.center_id AND c.is_active = TRUE
            WHERE ST_DWithin(c.coordinates, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
        `;

        const params = [lat, lng, radiusMeters];
        let paramIndex = 4;

        if (subject) {
            query += ` AND $${paramIndex} = ANY(t.subjects)`;
            params.push(subject);
            paramIndex++;
        }

        if (grade_level) {
            query += ` AND $${paramIndex} = ANY(t.grade_levels)`;
            params.push(grade_level);
            paramIndex++;
        }

        query += ` ORDER BY distance_km ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        res.status(200).json({ 
            success: true,
            teachers: result.rows,
            pagination: { page, limit }
        });
    } catch (err) {
        console.error('Error fetching nearby teachers:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};



const SearchForCenters = async (req, res) => {
  try {
    const name = req.query.name?.trim() || '';
    const address = req.query.address?.trim() || '';
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const grade_level = req.query.grade_level || null;
    const subject = req.query.subject || null;

    console.log('Search parameters:', { name, address, lat, lng, grade_level, subject });
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'INVALID_COORDINATES', message: 'Invalid latitude or longitude' } 
      });
    }

    const query = `
      SELECT 
        c.id, c.name, c.address, c.description, c.phone, c.logo_url, c.is_active,
        ST_Distance(
          c.coordinates, 
          ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography
        ) / 1000 AS distance_km
      FROM centers c
      INNER JOIN center_teachers ct ON ct.center_id = c.id AND ct.is_active = TRUE
      INNER JOIN teachers t ON t.id = ct.teacher_id
      WHERE c.is_active = TRUE
        AND ($1 = '' OR c.name ILIKE '%' || $1 || '%')
        AND ($2 = '' OR c.address ILIKE '%' || $2 || '%')
        AND ($5::text IS NULL OR t.grade_levels::text ILIKE '%' || $5 || '%')
        AND ($6::text IS NULL OR t.subjects::text ILIKE '%' || $6 || '%')
        AND ST_DWithin(
          c.coordinates,
          ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography,
          50000
        )
      ORDER BY distance_km ASC
      LIMIT 100
    `;

    const Centers = await pool.query(query, [name, address, lat, lng, grade_level, subject]);
    res.status(200).json({ success: true, centers: Centers.rows });

  } catch(error) {
    console.error('Error searching for centers:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: 'Internal server error' } 
    });
  }
};


const SearchForTeachers = async (req, res) => {
    try {
        const name = req.query.name || null;
        const subject = req.query.subject || null;
        const grade_level = req.query.grade_level || null;
        console.log(req.query);

        const query = `
            SELECT 
                t.id AS teacher_id,
                u.name AS teacher_name,
                u.avatar_url,
                t.subjects,
                t.grade_levels,
                t.rating,
                t.total_reviews
            FROM teachers t
            JOIN users u ON u.id = t.user_id
            WHERE 
                ($1::text IS NULL OR u.name ILIKE '%' || $1 || '%')
                AND ($2::text IS NULL OR $2 = ANY(t.subjects))
                AND ($3::text IS NULL OR $3 = ANY(t.grade_levels))
        `;
        

        const Teachers = await pool.query(query, [name, subject, grade_level]);
        res.status(200).json({ success: true, teachers: Teachers.rows });

    } catch (error) {
        console.error('Error searching for teachers:', error);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};


    const DetelsOfCenter = async (req, res) => {
    
    try
    {
const centerId = req.params.id;

if (centerId=== undefined || centerId === null) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Valid center ID is required');
}

const query = `
SELECT 
    c.id AS center_id,
    c.name AS center_name,
    c.address AS center_address,
    c.description AS center_description,
    c.phone AS center_phone,
    c.logo_url AS center_logo_url,
    json_agg(json_build_object(
        'teacher_id', t.id,
        'teacher_name', u.name,
        'avatar_url', u.avatar_url,
        'subjects', t.subjects,
        'grade_levels', t.grade_levels,
        'rating', t.rating,
        'total_reviews', t.total_reviews
    )) AS teachers
FROM centers c
LEFT JOIN center_teachers ct ON ct.center_id = c.id AND ct.is_active = TRUE
LEFT JOIN teachers t ON t.id = ct.teacher_id
LEFT JOIN users u ON u.id = t.user_id
WHERE c.id = $1 AND c.is_active = TRUE
GROUP BY c.id`;

const DCenter=await pool.query(query,[centerId]);

if (DCenter.rows.length === 0) {
    return sendError(res, 404, 'NOT_FOUND', 'Center not found');
}

res.status(200).json({ success: true, center: DCenter.rows[0] });



    }

    catch(error){
        console.error('Error fetching center details:', error);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
    
    }



const DetelsOfTeacher = async (req, res) => {
    try {
        const teacherId = req.params.id;

        if (!teacherId || !uuid.validate(teacherId)) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Valid teacher ID is required');
        }

        const TeacherExist = await pool.query(
            'SELECT id FROM teachers WHERE id = $1', 
            [teacherId]
        );
        if (TeacherExist.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Teacher not found');
        }

        const query = `
            SELECT 
                t.id AS teacher_id,
                u.name AS teacher_name,
                u.avatar_url,
                t.subjects,
                t.grade_levels,
                t.rating,
                t.total_reviews,
                t.bio,
                json_agg(json_build_object(
                    'center_id', c.id,
                    'center_name', c.name,
                    'center_address', c.address,
                    'center_description', c.description,
                    'center_phone', c.phone,
                    'center_logo_url', c.logo_url
                )) AS centers
            FROM teachers t
            JOIN users u ON u.id = t.user_id
            LEFT JOIN center_teachers ct ON ct.teacher_id = t.id AND ct.is_active = TRUE
            LEFT JOIN centers c ON c.id = ct.center_id AND c.is_active = TRUE
            WHERE t.id = $1
            GROUP BY t.id, u.name, u.avatar_url
        `;

        const DTeacher = await pool.query(query, [teacherId]);

        if (DTeacher.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Teacher not found');
        }

        res.status(200).json({ success: true, teacher: DTeacher.rows[0] });

    } catch (error) {
        console.error('Error fetching teacher details:', error);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};



    const GetAllSubjects = async (req, res) => {
    try
    {
const query = `SELECT DISTINCT unnest(subjects) AS subject FROM teachers`;
const subjects=await pool.query(query);
res.status(200).json({ success: true, subjects: subjects.rows.map(row => row.subject) });
    }
    catch(error){
        console.error('Error fetching subjects:', error);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};





const getTeacherReviews = async (req, res) => {
    
try
{
const teacherId =req.params.id;
console.log('Fetching reviews for teacher ID:', teacherId);
if (teacherId=== undefined || teacherId === null) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Valid teacher ID is required');
}
const query = `SELECT 
r.id AS review_id,
r.rating,
r.comment,
r.created_at,
u.name AS reviewer_name,
u.avatar_url AS reviewer_avatar
FROM reviews r
JOIN users u ON u.id = r.student_id
WHERE r.teacher_id = $1
ORDER BY r.created_at DESC`;
const reviews=await pool.query(query,[teacherId]);
if (reviews.rows.length === 0) {
    return sendError(res, 404, 'NOT_FOUND', 'No reviews found for this teacher');
}
res.status(200).json({ success: true, reviews: reviews.rows });


}
catch(error){
    console.error('Error fetching teacher reviews:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
}
}


const GetAllSessionsOFCenter = async (req, res) => {
    try {
        const centerId = (req.params.id);
        console.log('Fetching sessions for center ID:', centerId);
        if (centerId === undefined || centerId === null) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Valid center ID is required');
        }

        const CenterExit = await pool.query(
            'SELECT id FROM centers WHERE id = $1 AND is_active = TRUE', 
            [centerId]
        );
        if(CenterExit.rows.length === 0){
            return sendError(res, 404, 'NOT_FOUND', 'Center not found');
        }

        const query = `SELECT 
            s.id AS session_id,
            s.subject,
            s.grade_level,
            s.scheduled_at,
            s.duration_min,
            s.status,
            s.capacity,
            t.id AS teacher_id,
            u.name AS teacher_name,
            u.avatar_url AS teacher_avatar
        FROM sessions s
        JOIN teachers t ON t.id = s.teacher_id
        JOIN users u ON u.id = t.user_id
        WHERE s.center_id = $1
          AND s.status != 'completed'
          AND s.scheduled_at > NOW()
        ORDER BY s.scheduled_at ASC`;
        
        const sessions = await pool.query(query, [centerId]);
        res.status(200).json({ success: true, sessions: sessions.rows });
    } catch (error) {
        console.error('Error fetching sessions for center:', error);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};



module.exports = {
    getNearbyCenters,
    getNearbyCentersWithTeachers,
    SearchForCenters,
    SearchForTeachers,
    DetelsOfCenter,
    DetelsOfTeacher,
    GetAllSubjects,
    getTeacherReviews,
    GetAllSessionsOFCenter
};

