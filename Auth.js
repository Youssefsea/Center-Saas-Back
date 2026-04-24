const pool=require('./Clouds/Data');
const bcrypt=require('bcrypt');
const { generateToken } = require('./Middelware/JwtMaking');
const cloudinary = require('./Clouds/imgup');
const sendError = (res, status, code, message, meta = {}) =>
    res.status(status).json({ success: false, error: { code, message, ...meta } }); // ✅ FIXED: normalized error response shape

const uploadImage = async (file, folder, publicId) => {
    if (!file) return null;
    try {
        const result = await cloudinary.uploader.upload(file.path, {
            folder: folder,
            public_id: publicId, 
            overwrite: true,
            resource_type: "image"
        });
        return result.secure_url; 
    } catch (error) {
        console.error('Cloudinary Upload Error:', error);
        return null;
    }
};

const registerUser = async (req, res) => {
    const client = await pool.connect(); 

try
{
const {name, email, phone, password, role, lat, lng} = req.body;
   await client.query('BEGIN');
const UserExit = await client.query('SELECT id FROM users WHERE email = $1 OR phone = $2', [email, phone]);
if (UserExit.rows.length > 0) {
    await client.query('ROLLBACK');
    client.release();
    return sendError(res, 400, 'VALIDATION_ERROR', 'User already exists');

}

const hashPassword = await bcrypt.hash(password, 10);
let avatar_url = null;
let newUser;

const avatarFile = req.files?.avatar?.[0] || null; 
if (avatarFile) {
    avatar_url = await uploadImage(avatarFile, 'avatars', `avatar_${Date.now()}`);
}


try {
const userValues = [name, email, phone, hashPassword, role, avatar_url];
let userQuery = `INSERT INTO users (name, email, phone, password_hash, role, avatar_url`;
let userInsertValues = `$1, $2, $3, $4, $5, $6`;

if (lat && lng) {
    userValues.push(parseFloat(lng), parseFloat(lat));
    userQuery += `, location`;
    userInsertValues += `, ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography`;
}

userQuery += `) VALUES (${userInsertValues}) RETURNING id, name, email, phone, role, avatar_url, is_active, created_at`;

newUser = await client.query(userQuery, userValues);
} catch (error) {
    console.error('Error inserting user:', error);
    await client.query('ROLLBACK');
    client.release();
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to create user');
}

if(role === 'teacher')
{
    const bio = req.body.bio || null;
    const subjects = Array.isArray(req.body.subjects) ? req.body.subjects : [req.body.subjects].filter(Boolean); // Ensure it's an array and filter out empty values
    const grade_levels = Array.isArray(req.body.grade_levels) ? req.body.grade_levels : [req.body.grade_levels].filter(Boolean); // Ensure it's an array and filter out empty values
try {
    await client.query(
        'INSERT INTO teachers (user_id, bio, subjects, grade_levels) VALUES ($1, $2, $3, $4)',
        [newUser.rows[0].id, bio, subjects, grade_levels]
    );
} catch (error) {
    console.error('Error inserting teacher:', error);
    await client.query('ROLLBACK');
    client.release();
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to create teacher profile');
};}

if(role === 'center_admin')
{
    const centerName = req.body.center_name;
    const address = req.body.center_address;
    const description = req.body.center_description || null;
    const centerPhone = req.body.center_phone || null;
    const centerLat = req.body.center_lat;
    const centerLng = req.body.center_lng;

    if (!centerName || !address || !centerLat || !centerLng) {
        await client.query('ROLLBACK');
        client.release();
        return sendError(res, 400, 'VALIDATION_ERROR', 'Center name, address and coordinates are required');
    }

    let logo_url = null;
    if (req.files && req.files.logo) {
        logo_url = await uploadImage(req.files.logo[0], 'center_logos', `logo_${newUser.rows[0].id}`); // ✅ FIXED: support multer.fields logo input
    }   
try {
    const centerValues = [newUser.rows[0].id, centerName, address, description, centerPhone, logo_url, parseFloat(centerLng), parseFloat(centerLat)];
    await client.query(
        `INSERT INTO centers (owner_id, name, address, description, phone, logo_url, coordinates)
         VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography)`,
        centerValues
    );} catch (error) {
        console.error('Error inserting center:', error);
        await client.query('ROLLBACK');    
        client.release();
        return sendError(res, 500, 'SERVER_ERROR', 'Failed to create center');
    }
}

const token = generateToken({id: newUser.rows[0].id, email: newUser.rows[0].email, role: newUser.rows[0].role});

let moreInfo = null;
if (role === 'teacher') {
    const teacherInfo = await client.query('SELECT id, bio, subjects, grade_levels, rating, total_reviews FROM teachers WHERE user_id = $1', [newUser.rows[0].id]);
    moreInfo = teacherInfo.rows[0];
} else if (role === 'center_admin') {
    const centerInfo = await client.query('SELECT id, name, address, description, phone, logo_url FROM centers WHERE owner_id = $1', [newUser.rows[0].id]);
    moreInfo = centerInfo.rows[0];
}

await client.query('COMMIT');
client.release();
res.status(201).json({ success: true, user: newUser.rows[0], moreInfo,token });
}

catch(error){
    console.error('Error registering user:', error);
    await client.query('ROLLBACK');
    client.release();
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
}

}



const loginUser = async (req, res) => 
    {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', email);
        const user = await pool.query('SELECT id, email, password_hash, role, name, avatar_url FROM users WHERE email = $1', [email]); // ✅ FIXED: fetch safe profile fields for response
        if (user.rows.length === 0) {
            return sendError(res, 400, 'INVALID_CREDENTIALS', 'Invalid email or password');
        }
        const isMatch = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!isMatch) {
            return sendError(res, 400, 'INVALID_CREDENTIALS', 'Invalid email or password');
        }
        const token = generateToken({id: user.rows[0].id, email: user.rows[0].email, role: user.rows[0].role});
        res.status(200).json({
            success: true,
            message: 'Login successful',
            user: { id: user.rows[0].id, email: user.rows[0].email, role: user.rows[0].role, name: user.rows[0].name, avatar_url: user.rows[0].avatar_url }, // ✅ FIXED: removed password_hash leak from response
            token
        });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });

       }   };

       

       const getUserProfile = async (req, res) => {
        try
        {
const userId = req.user.id;
const userProfile = await pool.query(`
    SELECT
        id,
        name,
        email,
        phone,
        role,
        avatar_url,
        is_active,
        created_at,
        location,
        CASE WHEN location IS NOT NULL THEN ST_Y(location::geometry) ELSE NULL END as lat,
        CASE WHEN location IS NOT NULL THEN ST_X(location::geometry) ELSE NULL END as lng
    FROM users WHERE id = $1
`, [userId]);

let stats = null;
if (userProfile.rows[0].role === 'student') {
    const statsQuery = await pool.query(`
        SELECT
            COUNT(*) as total_bookings,
            COUNT(CASE WHEN b.status = 'attended' THEN 1 END) as attended_sessions,
            COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bookings,
            COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
            COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
            CASE
                WHEN COUNT(*) > 0
                THEN ROUND(COUNT(CASE WHEN b.status = 'attended' THEN 1 END)::numeric / COUNT(*) * 100, 1)
                ELSE 0
            END as attendance_rate
        FROM bookings b
        WHERE b.student_id = $1
    `, [userId]);
    stats = statsQuery.rows[0];
}

res.status(200).json({ success: true, user: userProfile.rows[0], stats });


        }
    catch(error){
        console.error('Error fetching user profile:', error);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
    }


 const updateUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, phone, lat, lng } = req.body;
        console.log("req.body", req.body);
        
        let query = 'UPDATE users SET name = $1, phone = $2';
        const values = [name, phone];
        
        if (lat && lng) {
            query += ', location = ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography';
            values.push(parseFloat(lng), parseFloat(lat));
        }
        
        query += ' WHERE id = $' + (values.length + 1) + ' RETURNING id, name, email, phone, role, avatar_url, is_active, created_at';
        values.push(userId);
        
        const updatedUser = await pool.query(query, values);
        res.status(200).json({ success: true, user: updatedUser.rows[0] });
    } catch(error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

    


module.exports = { registerUser, loginUser, getUserProfile, updateUserProfile };
