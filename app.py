import streamlit as st
import os
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv()

# Initialize Groq Client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Use the shared TITAN-X brain module for prompts and formatting
from brain import (
    STRATEGY_ROOM_CONTEXT,
    format_analysis,
    format_deep,
    format_chat,
    format_synthesis,
    format_execution,
)

# -----------------------------------------------------------------------------
# STREAMLIT UI & STATE MANAGEMENT
# -----------------------------------------------------------------------------

st.set_page_config(page_title="TITAN-X | Strategic Proposal Engine", layout="wide")
st.title("TITAN-X Strategic Proposal Intelligence System")
st.caption("Behavioral Proposal Engineering | Analysis Mode Active")

if "analysis_result" not in st.session_state:
    st.session_state.analysis_result = None
if "analysis_revision" not in st.session_state:
    st.session_state.analysis_revision = None
if "final_proposal" not in st.session_state:
    st.session_state.final_proposal = None
if "mode" not in st.session_state:
    st.session_state.mode = "ANALYSIS"
if "messages" not in st.session_state:
    st.session_state.messages = []  # list of {role: 'user'|'assistant', 'content': str}

# Input Section
with st.container():
    st.subheader("Step 1: Job Description")
    job_desc = st.text_area(
        "Paste the complete job description:",
        height=220,
        placeholder="Paste the full job post here...",
        key="job_input"
    )

# Chat input row (simplified)
st.markdown("<style>html, body, .block-container{background-color:#0b1020;color:#c9d1d9;} .stTextInput>div>div>input{background:#0b1020;color:#c9d1d9;border:1px solid #233447;} .stTextArea>div>div>textarea{background:#0b1020;color:#c9d1d9;border:1px solid #233447;} .stButton>button{background:#0b1222;color:#c9d1d9;border:1px solid #2b6ea3;} .stMarkdown{color:#c9d1d9;}</style>", unsafe_allow_html=True)
st.markdown("---")
st.subheader("Chat with TITAN-X")
msg_col, send_col = st.columns([5, 1])
with msg_col:
    chat_input = st.text_input("Ask anything or give feedback to refine the analysis:", key="chat_input")
with send_col:
    send_btn = st.button("Send")

st.divider()

# -----------------------------------------------------------------------------
# BACKEND PROCESSING LOGIC
# -----------------------------------------------------------------------------

def run_analysis(jd: str) -> str:
    try:
        prompt = format_analysis(jd)
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": STRATEGY_ROOM_CONTEXT.format(mode="ANALYSIS")},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Engine Failure: {str(e)}"


def run_deeper_analysis(previous_analysis: str, comment: str) -> str:
    try:
        prompt = format_deep(previous_analysis, comment)
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": STRATEGY_ROOM_CONTEXT.format(mode="ANALYSIS")},
                {"role": "user", "content": prompt}
            ],
            temperature=0.25,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Engine Failure: {str(e)}"


RUN_CHAT_PROMPT = """
You are TITAN-X in ANALYSIS mode. Produce a short, helpful assistant reply to the user's chat message.
Use the PREVIOUS ANALYSIS as context and answer in a conversational tone (2-6 sentences). Focus on actionable suggestions, next steps, or clarifying questions the user can act on.

PREVIOUS ANALYSIS:
{previous_analysis}

USER MESSAGE:
{user_message}
"""


def run_chat_reply(previous_analysis: str, user_message: str) -> str:
    try:
        prompt = format_chat(previous_analysis or "", user_message)
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": STRATEGY_ROOM_CONTEXT.format(mode="ANALYSIS")},
                {"role": "user", "content": prompt}
            ],
            temperature=0.45,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Engine Failure: {str(e)}"


def run_synthesis(previous_analysis: str, notes: str) -> str:
    try:
        prompt = format_synthesis(previous_analysis, notes)
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": STRATEGY_ROOM_CONTEXT.format(mode="ANALYSIS")},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Engine Failure: {str(e)}"


def run_execution(analysis: str) -> str:
    try:
        prompt = format_execution(analysis)
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": STRATEGY_ROOM_CONTEXT.format(mode="EXECUTION")},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"❌ Execution Failure: {str(e)}"

# -----------------------------------------------------------------------------
# EVENT HANDLERS
# -----------------------------------------------------------------------------


if send_btn and chat_input:
    # append user message to chat
    st.session_state.messages.append({"role": "user", "content": chat_input})
    # determine analysis action
    if not st.session_state.analysis_result:
        if not job_desc:
            st.warning("Please paste the job description before asking for analysis.")
        else:
            with st.spinner("🧠 Running initial analysis based on your job description and message..."):
                result = run_analysis(job_desc + "\n\nUser chat: " + chat_input)
                st.session_state.analysis_result = result
                st.session_state.mode = "READY_FOR_REFINEMENT"
                assistant_text = run_chat_reply(result, chat_input)
                st.session_state.messages.append({"role": "assistant", "content": assistant_text})
    else:
        # refine existing analysis using the chat message
        source = st.session_state.analysis_revision or st.session_state.analysis_result
        with st.spinner("🔎 Deepening analysis with your input..."):
            refined = run_deeper_analysis(source, chat_input)
            st.session_state.analysis_revision = refined
            st.session_state.mode = "READY_FOR_REFINEMENT"
            assistant_text = run_chat_reply(refined, chat_input)
            st.session_state.messages.append({"role": "assistant", "content": assistant_text})
    # clear input field by rerunning
    st.query_params = {}
    st.rerun()

# Final execution button — available once analysis exists
if st.session_state.analysis_result:
    exec_col1, exec_col2 = st.columns([3, 1])
    with exec_col1:
        st.info("Analysis available. Refine the conversation, then press the final button to generate the cover letter.")
    with exec_col2:
        final_execute = st.button("⚡ Let’s write the final CL", use_container_width=True)
    if final_execute:
        with st.spinner("✍️ Reader-First Strategist crafting final proposal..."):
            source = st.session_state.analysis_revision or st.session_state.analysis_result
            st.session_state.final_proposal = run_execution(source)
        st.session_state.mode = "EXECUTION_COMPLETE"
        st.rerun()

# -----------------------------------------------------------------------------
# DISPLAY RESULTS
# -----------------------------------------------------------------------------

if st.session_state.analysis_result:
    st.subheader("📊 Internal Strategic Reasoning (Hidden from Client)")
    with st.expander("View 12-Engine Analysis Report", expanded=False):
        source = st.session_state.analysis_revision or st.session_state.analysis_result
        st.markdown(source)

# Chat history display (bottom)
if st.session_state.messages:
    st.markdown("---")
    st.subheader("Conversation")
    for m in st.session_state.messages:
        if m["role"] == "user":
            st.markdown(f"**You:** {m['content']}")
        else:
            st.markdown(f"**TITAN-X:** {m['content']}")

if st.session_state.final_proposal:
    st.divider()
    st.subheader("✅ FINAL ENGINEERED PROPOSAL")
    st.markdown(st.session_state.final_proposal)
    st.code(st.session_state.final_proposal, language="markdown")
