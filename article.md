# I Gave a College Campus Assistant a Memory — and It Started Giving Advice I Hadn't Programmed

"Where's the canteen?" asked the same student for the third time this week. I stared at the Gemini API logs and thought: what if our chatbot didn't just answer questions — what if it actually *remembered* the student, learned their interests, and started proactively recommending things? That question led me down a rabbit hole of agent memory that changed how I think about building AI-powered applications.

## What We Built

SCOEFLOW CONNECT is a student management platform for Saraswati College of Engineering (SCOE) in Navi Mumbai. It handles the boring stuff — student records, exam management, Mumbai University–compliant SGPA/CGPA calculations, result publishing. But the part that got interesting was the Student Portal: an AI campus assistant that knows every floor of the building, remembers what each student cares about, and generates personalized recommendations for clubs, academics, and career paths.

The stack: React 18 + TypeScript on the frontend, FastAPI on the backend, Firebase Firestore for persistence, Google Gemini 2.5 Flash for generation, and — the piece that made everything click — [Hindsight](https://github.com/vectorize-io/hindsight) for agent memory.

The architecture looks roughly like this:

```
Student → React UI → FastAPI endpoints → Gemini 2.5 Flash
                                       ↕
                              Hindsight Cloud (memory)
                                       ↕
                              Firestore (chat history, profiles)
```

## The Problem With Stateless AI Assistants

The first version of our chatbot was simple. Student asks a question, we stuff the SCOE campus knowledge into a system prompt, call Gemini, return the answer. It worked. Ask "where's the canteen?" and it'd correctly say "Ground Floor." Ask about the CS department and it'd tell you "Second Floor, Lab 1-3."

But it had no idea who it was talking to. A third-year CS student interested in AI/ML would get the same generic answer as a first-year mechanical student. If a student asked about NSS events three times, the bot didn't know that — it couldn't connect the dots and suggest they actually join NSS.

I initially thought I'd solve this by just loading the last N messages from Firestore into the prompt. We did implement chat history persistence:

```python
def _save_chat_message(student_id: str, role: str, text: str):
    db = get_firestore_db()
    db.collection("chat_history").document(student_id) \
      .collection("messages").add({
        "role": role,
        "text": text,
        "timestamp": datetime.utcnow().isoformat()
    })
```

This gave us conversation continuity within a session. But it didn't give us *learning*. The bot couldn't synthesize that "this student keeps asking about coding clubs" means "this student would probably benefit from joining Rotaract's professional networking track." That's not retrieval — that's reasoning over accumulated context. That's memory.

## Enter Hindsight: Memory That Actually Works Like Memory

I'd been skeptical of "agent memory" solutions. Most of them are just vector stores with a fancy name — you embed stuff, you retrieve stuff, done. [Hindsight](https://hindsight.vectorize.io/) turned out to be different in a way that mattered for our use case.

The core idea: each student gets their own memory bank. Every interaction gets stored not as a raw embedding, but as structured knowledge that Hindsight organizes into facts, experiences, and opinions. When we need context for a response, we don't just do similarity search — we can ask Hindsight to *reflect* on what it knows about this student.

Here's how we set up per-student memory banks:

```python
def ensure_bank(student_id: str):
    bank_id = f"student-{student_id}"
    resp = requests.post(
        f"{HINDSIGHT_BASE_URL}/banks",
        json={
            "bank_id": bank_id,
            "name": f"Student {student_id} Memory",
            "mission": (
                "Remember this student's interests, clubs they joined, "
                "events they attended, questions they asked, and their "
                "preferences. Use memories to give personalized event "
                "recommendations, club suggestions, and campus navigation help."
            ),
        },
        headers=_headers(),
    )
```

The `mission` field is doing real work here — it tells Hindsight *what kind of memories matter* for this bank. It's not just storing everything; it's storing with intent.

## The Three-Layer Memory Architecture

Our chat endpoint (`chat.py`) uses a three-layer approach, and the ordering matters:

**Layer 1: Hindsight Reflect (try first)**

Before even calling Gemini, we ask Hindsight: "Given everything you know about this student, can you answer this question?"

```python
hindsight_answer = _reflect_hindsight(
    request.student_id,
    request.message,
    SCOE_KNOWLEDGE[:2000]
)
if hindsight_answer:
    return ChatResponse(response=hindsight_answer, source="hindsight")
```

If Hindsight has enough accumulated context to answer, we skip the LLM entirely. This is faster, cheaper, and — here's the surprising part — often more personalized than what Gemini would produce, because Hindsight's reflection is grounded in *this specific student's* history.

**Layer 2: Hindsight Recall + Gemini (fallback)**

If reflect doesn't have enough context, we recall relevant memories and inject them into the Gemini prompt alongside the student's personality profile, recent chat history, and campus knowledge:

```python
hindsight_memories = _recall_hindsight(student_id, request.message)
memory_section = f"\nStudent Memories:\n{hindsight_memories}" if hindsight_memories else ""

prompt = f"""You are the SCOE campus assistant...
{SCOE_KNOWLEDGE}
{student_ctx}
{personality_ctx}
{memory_section}
{history_ctx}
Student Question: {request.message}"""
```

**Layer 3: Store everything (always)**

Every Q&A pair gets stored back into Hindsight, creating a compounding knowledge loop:

```python
_store_hindsight(student_id, f"Q: {request.message}\nA: {ai_response}")
```

Over time, Hindsight accumulates enough context per student that Layer 1 starts handling more queries directly. The system literally gets better with use — not through fine-tuning, not through prompt engineering, but through [memory that learns](https://vectorize.io/features/agent-memory).

## The Personality-to-Recommendations Pipeline

The onboarding quiz collects nine data points: academic interests, favorite subjects, sports, clubs, learning style, social preference, career goals, and semester objectives. We store this in Firestore *and* push it into Hindsight as structured memories:

```python
def store_personality_memory(student_id: str, personality_data: dict):
    parts = []
    if personality_data.get('academic_interest'):
        parts.append(f"Student's academic interest level is {personality_data['academic_interest']}")
    if personality_data.get('clubs_interested'):
        parts.append(f"Student is interested in clubs: {', '.join(personality_data['clubs_interested'])}")
    for part in parts:
        store_memory(student_id, part, "personality_profile")
```

This is where it got interesting. When we built the `/recommendations` endpoint, we combined the Firestore personality profile with Hindsight's recalled memories and asked Gemini to generate structured recommendations. The recommendations from students who had chatted more were noticeably better — Hindsight's accumulated interaction history gave Gemini richer context to work with.

A student who'd asked about coding competitions, ML labs, and hackathons twice would get club recommendations weighted toward technical clubs with specific match scores. A student who mostly asked about sports facilities and cultural events would get entirely different suggestions. Same code, same prompt template — different memories, different output.

## The Animation Tangent (And Why It Matters for UX)

We also built 240-frame smooth animations for each of our three clubs — NSS, Rotaract, and Student Council. Each club has its own set of frames that play back at 30fps using a canvas renderer:

```typescript
const animate = (timestamp: number) => {
    const elapsed = timestamp - lastTimeRef.current;
    if (elapsed >= FRAME_DURATION) {
        lastTimeRef.current = timestamp - (elapsed % FRAME_DURATION);
        const nextFrame = (frameRef.current + 1) % TOTAL_FRAMES;
        frameRef.current = nextFrame;
        drawFrame(nextFrame);
    }
    rafRef.current = requestAnimationFrame(animate);
};
```

We preload all 240 frames into `Image` objects and render directly to canvas — no DOM manipulation per frame, no React re-renders in the animation loop. The first attempt used scroll-driven animation with framer-motion's `useScroll`, but that caused visible jank because scroll events don't fire at a consistent rate. Switching to `requestAnimationFrame` with manual frame timing solved it completely.

This isn't directly related to AI, but it matters: if the rest of your app feels janky, users won't trust the AI features either. Polish compounds.

## What Surprised Me

The moment that sold me on Hindsight was when a student asked "what should I do this semester?" — a completely open-ended question. The system pulled their personality profile (career goal: AI researcher, learning style: hands-on, clubs interested: technical), combined it with Hindsight memories from past sessions (they'd previously asked about ML labs and research opportunities), and generated recommendations that felt like they came from an advisor who'd been paying attention. No retrieval query engineering, no conversation threading logic — just accumulated memory doing its job.

The other surprise was how cheap it was. Because Hindsight reflect handles a growing percentage of queries without calling Gemini, our API costs didn't scale linearly with usage. More students using the system actually improved the per-student response quality while keeping costs flat.

## Lessons Learned

- **Agent memory is not just a bigger context window.** RAG gives you retrieval. Chat history gives you continuity. But structured memory that can *reflect* — reason over accumulated knowledge — gives you something qualitatively different. Hindsight's reflect endpoint was the unlock.

- **Per-entity memory banks are worth the setup cost.** Creating separate memory banks per student felt like over-engineering at first. It turned out to be essential — shared memory would have leaked context between students, and the `mission` field per bank lets you tune what gets remembered.

- **Store intent, not just data.** When we stored "Student asked about NSS events," Hindsight could later reason that the student is interested in community service. When we just stored raw Q&A pairs, the reasoning was weaker. The context parameter in `store_memory` matters more than you'd think.

- **Graceful degradation is non-negotiable.** Every Hindsight call in our system is wrapped in try/except with fallback to pure Gemini. If the memory layer goes down, the chatbot still works — just without personalization. Users get slower, generic responses instead of errors.

- **Canvas > DOM for frame animations.** If you're rendering 240+ images sequentially, don't use React state updates or DOM swapping. `requestAnimationFrame` + canvas `drawImage` is the only approach that stays at 30fps without dropped frames.

## What's Next

The obvious next step is feeding exam results into Hindsight. A student who failed Thermodynamics should get different academic recommendations than one who aced it — and the system should remember that context across semesters. The memory bank per student already supports this; we just need to push more events into it.

We're also looking at using Hindsight's memory to power a proactive notification system. Instead of waiting for students to ask questions, the system could surface relevant information based on accumulated knowledge: "You've asked about placement prep three times this month — here's the TPO office schedule and upcoming mock interview dates."

The whole thing started as a simple campus Q&A bot. Adding structured agent memory turned it into something that actually learns. The code is at [github.com/Pranavraut111/SCOEFLOWW](https://github.com/Pranavraut111/SCOEFLOWW) if you want to see how it all fits together.

---

*Built at Saraswati College of Engineering, Kharghar. Powered by Gemini 2.5 Flash, [Hindsight agent memory](https://github.com/vectorize-io/hindsight), and too much chai.*
