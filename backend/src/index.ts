import express from 'express';
import cors from 'cors';
import { YoutubeTranscript } from 'youtube-transcript';
import OpenAI from 'openai';

const app = express();
const port = process.env.PORT || 3001;

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is not set.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

app.post('/api/transcript', async (req: express.Request, res: express.Response) => {
  const { videoUrl } = req.body;

  if (!videoUrl) {
    return res.status(400).json({ error: 'videoUrl is required' });
  }

  // Mocking logic
  if (videoUrl === 'mock') {
    return res.json({
      transcript: [
        { text: 'This is the first mock sentence.', offset: 0, duration: 2000 },
        { text: 'This is a second sentence for testing.', offset: 2000, duration: 3000 },
        { text: 'And a third one to complete the test.', offset: 5000, duration: 4000 },
      ],
    });
  }

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoUrl);
    res.json({ transcript });
  } catch (error) {
    console.error('Error fetching transcript:', error);
    res.status(500).json({ error: 'Transcript is disabled for this video or an error occurred.' });
  }
});

app.post('/api/explain', async (req: express.Request, res: express.Response) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that provides deep and clear explanations for complex topics. The user will provide a piece of text from a video transcript, and you should explain the key concepts in it. Format the explanation in simple HTML.'
        },
        {
          role: 'user',
          content: text
        }
      ],
    });

    const explanation = completion.choices[0]?.message?.content;

    if (!explanation) {
      return res.status(500).json({ error: 'Failed to generate explanation' });
    }

    res.json({ explanation });
  } catch (error) {
    console.error('Error generating explanation:', error);
    res.status(500).json({ error: 'Failed to generate explanation' });
  }
});

app.post('/api/media', async (req: express.Request, res: express.Response) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    const promptCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates concise and descriptive image prompts. The user will provide a piece of text from a video transcript, and you should summarize it into a prompt of 20 words or less for an image generation model.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
    });

    const generatedPrompt = promptCompletion.choices[0]?.message?.content;

    if (!generatedPrompt) {
      return res.status(500).json({ error: 'Failed to generate prompt' });
    }

    const image = await openai.images.generate({
      model: "dall-e-3",
      prompt: generatedPrompt,
      n: 1,
      size: "1024x1024",
    });

    const imageUrl = image.data?.[0]?.url;

    if (!imageUrl) {
      return res.status(500).json({ error: 'Failed to generate image' });
    }

    res.json({ imageUrl });
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
