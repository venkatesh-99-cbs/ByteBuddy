from backend.prompts import CONTINUATION_PROMPT, MODE_INSTRUCTIONS, SYSTEM_INSTRUCTION


def sanitize_history(history, max_history_messages):
    if not isinstance(history, list):
        return []

    cleaned = []
    for item in history[-max_history_messages:]:
        if not isinstance(item, dict):
            continue

        role = item.get("role")
        content = (item.get("content") or "").strip()
        if role not in {"user", "assistant"} or not content:
            continue

        cleaned.append({"role": role, "content": content})

    return cleaned


def build_messages(mode, history, user_message, max_history_messages):
    selected_mode = mode if mode in MODE_INSTRUCTIONS else "code"
    system_text = (
        f"{SYSTEM_INSTRUCTION.strip()}\n\n"
        f"Active mode: {selected_mode}\n"
        f"Mode instructions: {MODE_INSTRUCTIONS[selected_mode]}"
    )

    messages = [{"role": "system", "content": system_text}]
    messages.extend(sanitize_history(history, max_history_messages))
    messages.append({"role": "user", "content": user_message})
    return messages


def continue_messages(previous_messages, partial_response):
    updated = list(previous_messages)
    updated.append({"role": "assistant", "content": partial_response})
    updated.append({"role": "user", "content": CONTINUATION_PROMPT})
    return updated
