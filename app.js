import mongoose from 'mongoose';
import multer from 'multer';
import sizeOf from 'image-size';

const upload = multer({ storage: multer.memoryStorage() });

export default function appFactory(express, bodyParser, createReadStream, crypto, http) {
    const app = express();

    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods',
            'GET,POST,PUT,PATCH,OPTIONS,DELETE');
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
        let filePath = new URL(import.meta.url).pathname;
        if (process.platform === 'win32') {
            filePath = filePath.substring(1);
        }
        const stream = createReadStream(filePath);
        stream.pipe(res);
    });

    app.get('/sha1/:input/', (req, res) => {
        const hash = crypto.createHash('sha1').
        update(req.params.input).digest('hex');
        res.send(hash);
    });

    const fetchUrl = (url, callback) => {
        if (!url.startsWith('http://')) {
            callback(new Error('Only HTTP URLs are supported'));
            return;
        }
        http.get(url, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => callback(null, data));
        }).on('error', (err) => callback(err));
    };

    app.get('/req/', (req, res) => {
        const addr = req.query.addr;
        if (!addr) return res.status(400).send('Missing addr parameter');
        fetchUrl(addr, (err, data) => {
            if (err) return res.status(500).send('Error fetching URL');
            res.send(data);
        });
    });

    app.post('/req/', (req, res) => {
        const addr = req.body.addr;
        if (!addr) return res.status(400).send('Missing addr in body');
        fetchUrl(addr, (err, data) => {
            if (err) return res.status(500).send('Error fetching URL');
            res.send(data);
        });
    });

    app.post('/size2json/', upload.single('image'), (req, res) => {
        if (!req.file) return res.status(400).json(
            { error: 'No image file provided. Use field name "image".' });
        if (req.file.mimetype !== 'image/png') return res.status(400).json(
            { error: 'Only PNG images are allowed.' });
        try {
            const dimensions = sizeOf(req.file.buffer);
            res.json({ width: dimensions.width, height: dimensions.height });
        } catch (err) {
            res.status(500).json({ error: 'Unable to parse image dimensions' });
        }
    });

    app.post('/insert/', async (req, res) => {
        const { login, password, URL } = req.body;
        if (!login || !password || !URL) {
            return res.status(400).json({ error: 'Missing fields: login, password, URL are required' });
        }
        let connection = null;
        try {
            connection = await mongoose.createConnection(URL, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            const userSchema = new mongoose.Schema({login: String, password: String,});
            const User = connection.model('User', userSchema, 'users');
            const doc = new User({ login, password });
            await doc.save();
            res.json({ ok: 1, message: 'User saved successfully' });
        } catch (err) {
            res.status(500).json({ error: 'Database error: ' + err.message });
        } finally {
            if (connection) {await connection.close();}
        }
    });

    app.all('*', (req, res) => {
        res.send('408456');
    });

    return app;
}