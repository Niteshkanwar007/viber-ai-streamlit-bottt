# viber-ai-streamlit-bottt
Python-based Viber bot integration using the Viber API and Streamlit framework. Includes AI response generation, webhook handling, and a lightweight admin UI.

Notes
 - This project uses Groq for model access. Set your API key as `GROQ_API_KEY` in a local `.env` file (copy from `.env.example`).
 - Streamlit serves the UI on port `8501` by default. Run with:

```bash
streamlit run app.py --server.port 8501 --server.headless true
```
