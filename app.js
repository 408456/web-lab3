export default function appFactory(express, bodyParser, createReadStream, crypto, http) {
    const app = express();

    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,OPTIONS,DELETE');
        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
            return;
        }
        next();
    });

    app.use(bodyParser.urlencoded({ extended: true }));

    app.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.endsWith('/') && !req.path.includes('.')) {
            const redirectUrl = req.originalUrl.replace(/\/?$/, '/');
            res.redirect(301, redirectUrl);
        } else {
            next();
        }
    });

    app.get('/login/', (req, res) => {
        res.send('408456');
    });

    app.get('/code/', (req, res) => {
        const filePath = import.meta.url.substring(7);
        const stream = createReadStream(filePath);
        stream.pipe(res);
    });

    app.get('/sha1/:input/', (req, res) => {
        const hash = crypto.createHash('sha1').update(req.params.input).digest('hex');
        res.send(hash);
    });

    const fetchUrl = (url, callback) => {
        http.get(url, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => callback(null, data));
        }).on('error', (err) => callback(err));
    };

    app.get('/req/', (req, res) => {
        const addr = req.query.addr;
        if (!addr) {
            res.status(400).send('Missing addr parameter');
            return;
        }
        fetchUrl(addr, (err, data) => {
            if (err) {
                res.status(500).send('Error fetching URL');
            } else {
                res.send(data);
            }
        });
    });

    app.post('/req/', (req, res) => {
        const addr = req.body.addr;
        if (!addr) {
            res.status(400).send('Missing addr in body');
            return;
        }
        fetchUrl(addr, (err, data) => {
            if (err) {
                res.status(500).send('Error fetching URL');
            } else {
                res.send(data);
            }
        });
    });

    app.all('*', (req, res) => {
        res.send('408456');
    });

    return app;
}