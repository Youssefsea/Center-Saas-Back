const pool = require('../Clouds/Data');
const sendError = (res, status, code, message, meta = {}) =>
    res.status(status).json({ success: false, error: { code, message, ...meta } }); // ✅ FIXED: normalized error response shape

const getWalletBalance = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT COALESCE(
                SUM(CASE 
                    WHEN type IN ('deposit', 'refund', 'transfer') AND status = 'completed' THEN amount
                    WHEN type IN ('withdrawal', 'booking_charge') AND status = 'completed' THEN -amount
                    ELSE 0
                END), 0
            ) AS balance
            FROM wallet_transactions WHERE user_id = $1`,
            [userId]
        );

        res.status(200).json({
            success: true,
            balance: parseFloat(result.rows[0].balance)
        });

    } catch (err) {
        console.error('Error fetching wallet balance:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const getTransactionHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('Fetching transactions for user ID:', userId);
        const { type, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT id, amount, type, status, reference_id, reference_type, description, created_at, completed_at
            FROM wallet_transactions
            WHERE user_id = $1
        `;
        const params = [userId];

        let countQuery = `
            SELECT COUNT(*) 
            FROM wallet_transactions
            WHERE user_id = $1
        `;
        const countParams = [userId];

        if (type) {
            query += ` AND type = $2`;
            params.push(type);

            countQuery += ` AND type = $2`;
            countParams.push(type);
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const [result, countResult] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery, countParams)
        ]);

        res.status(200).json({
            success: true,
            transactions: result.rows,
            total: parseInt(countResult.rows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

    } catch (err) {
        console.error('Error fetching transactions:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const depositToWallet = async (req, res) => {
    const client = await pool.connect(); 
    try {
        const userId = req.user.id;
        const { amount, paymentMethod, paymentReference } = req.body;

        if (!amount || amount <= 0) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Valid amount is required');
        }

        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO wallet_transactions 
                (user_id, amount, type, status, description, payment_method, external_ref, completed_at)
             VALUES ($1, $2, 'deposit', 'completed', 'Wallet deposit', $3, $4, NOW())
             RETURNING id, amount, type, status, created_at, completed_at`,
            [userId, amount, paymentMethod || 'manual', paymentReference || null]
        );

        const balanceResult = await client.query(
            `SELECT COALESCE(
                SUM(CASE 
                    WHEN type IN ('deposit', 'refund') AND status = 'completed' THEN amount
                    WHEN type IN ('withdrawal', 'booking_charge') AND status = 'completed' THEN -amount
                    ELSE 0
                END), 0
            ) AS balance
            FROM wallet_transactions WHERE user_id = $1`,
            [userId]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Deposit successful',
            transaction: result.rows[0],
            new_balance: parseFloat(balanceResult.rows[0].balance)
        });

    } catch (err) {
        await client.query('ROLLBACK'); 
        console.error('Error depositing to wallet:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    } finally {
        client.release(); 
    }
};

module.exports = {
    getWalletBalance,
    getTransactionHistory,
    depositToWallet
};
