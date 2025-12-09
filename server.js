import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Modern encryption/decryption for video IDs
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-this-32chars';
// Create a proper 32-byte key from the string
const KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
const IV_LENGTH = 16; // For AES, this is always 16

function encryptVideoId(videoId) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);
    let encrypted = cipher.update(videoId, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // Prepend IV to encrypted data
    return iv.toString('hex') + ':' + encrypted;
}

function decryptVideoId(encryptedId) {
    try {
        const parts = encryptedId.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        return null;
    }
}

// In-memory lesson database (replace with real DB in production)
const lessons = [
    {
        id: 1,
        title: 'Umar M Shareef',
        description: 'Upload By Bashir Yusuf AS An Assiagnment',
        duration: '15:30',
        // REPLACE THE VIDEO ID BELOW with your own YouTube Video ID
        // Example: For https://www.youtube.com/watch?v=dQw4w9WgXcQ, the ID is dQw4w9WgXcQ
        // Make sure "Allow embedding" is ENABLED in your YouTube Studio settings!
        // Testing with known embeddable video
        videoId: 'stwTyIy6Ae4',
        thumbnail: 'https://img.youtube.com/vi/stwTyIy6Ae4/maxresdefault.jpg'
    },
    {
        id: 2,
        title: 'Umar M Shareef',
        description: 'Upload By Bashir Yusuf AS An Assiagnment',
        duration: '22:45',
        videoId: 'stwTyIy6Ae4',
        thumbnail: 'https://img.youtube.com/vi/stwTyIy6Ae4/maxresdefault.jpg'
    },
    {
        id: 3,
        title: 'Umar M Shareef',
        description: 'Upload By Bashir Yusuf AS An Assiagnment',
        duration: '18:20',
        videoId: 'stwTyIy6Ae4',
        thumbnail: 'https://img.youtube.com/vi/stwTyIy6Ae4/maxresdefault.jpg'
    }
];

// Routes

// Get all lessons (without video IDs)
app.get('/api/lessons', (req, res) => {
    const safeLessons = lessons.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        duration: lesson.duration,
        thumbnail: lesson.thumbnail
    }));
    res.json(safeLessons);
});

// Get encrypted video ID for a specific lesson
app.get('/api/lessons/:id/video', (req, res) => {
    const lessonId = parseInt(req.params.id);
    const lesson = lessons.find(l => l.id === lessonId);

    if (!lesson) {
        return res.status(404).json({ error: 'Lesson not found' });
    }

    // Return encrypted video ID
    const encryptedId = encryptVideoId(lesson.videoId);
    res.json({
        encryptedVideoId: encryptedId,
        // Add some noise/metadata to make it harder to identify
        timestamp: Date.now(),
        checksum: crypto.createHash('md5').update(encryptedId + Date.now()).digest('hex')
    });
});

// Decrypt video ID (called by frontend player)
app.post('/api/decrypt', (req, res) => {
    const { encryptedVideoId } = req.body;

    if (!encryptedVideoId) {
        return res.status(400).json({ error: 'Missing encrypted video ID' });
    }

    const videoId = decryptVideoId(encryptedVideoId);

    if (!videoId) {
        return res.status(400).json({ error: 'Invalid encrypted video ID' });
    }

    // Verify the video ID exists in our lessons
    const isValid = lessons.some(lesson => lesson.videoId === videoId);

    if (!isValid) {
        return res.status(403).json({ error: 'Unauthorized video access' });
    }

    res.json({ videoId });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(` Lesson Player API running on http://localhost:${PORT}`);
});
