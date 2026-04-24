const express=require('express');
const app=express();
const pool=require('../Clouds/Data');
const router=require('../router');
app.use(express.json());


app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:3005'];
    
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*'); // لأي origin تاني
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') return res.sendStatus(200); // ← مهم جداً
    next();
});




app.use('/',router);


// const port=3005;
// app.listen(port,()=>{
//     console.log(`Server is running on port ${port} http://localhost:${port}`);
// });


module.exports=app;