/**
 * 注意：此文件已不再使用！
 * 当前应用使用NestJS框架，入口文件为src/main.ts
 * 请使用`npm run start:dev`启动应用
 */

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
