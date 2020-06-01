const express = require('express');
const path = require('path');

const app = express();
const router = express.Router();

const port = 4000;

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use('/', router);

app.get('/', (request, response) => {
    response.render('index', { code: request.query.code });
});

app.listen(port, () => console.log('Callback Server listening on port 4000.'));
