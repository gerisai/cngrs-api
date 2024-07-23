import express from 'express';
import createError from 'http-errors';
import cookieParser from 'cookie-parser';

import userRouter from './routes/user.js';
import authRouter from './routes/auth.js';
import personRouter from './routes/person.js';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use('/user', userRouter);
app.use('/auth', authRouter);
app.use('/person', personRouter);

// catch 404 and forward to error handler
app.use(function(r, s, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
  
    // render the error page
    res.status(err.status || 500);
    res.send('Error');
});

export default app;
