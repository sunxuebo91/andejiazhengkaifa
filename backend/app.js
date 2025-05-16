// 导入路由
const ocrRoutes = require('./routes/ocr');
const mapRoutes = require('./routes/map');

// 注册路由
app.use('/api/ocr', ocrRoutes); 
app.use('/api/map', mapRoutes); 

// 移除百度地图路由
// const mapRouter = require('./routes/map');
// app.use('/map', mapRouter);

// 高德地图路由已删除
// const amapRouter = require('./routes/amap');
// app.use('/amap', amapRouter);
