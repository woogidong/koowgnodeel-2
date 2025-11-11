// Chatbot.js

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

function createEl(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') {
      el.className = v;
    } else if (k === 'style' && typeof v === 'object') {
      Object.assign(el.style, v);
    } else {
      el.setAttribute(k, v);
    }
  });
  const list = Array.isArray(children) ? children : [children];
  list.forEach((child) => {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child) el.appendChild(child);
  });
  return el;
}

function lastChar(text) {
  if (!text) return '';
  const trimmed = text.trim();
  return trimmed[trimmed.length - 1] || '';
}

function renderMessage(container, role, text) {
  const bubble = createEl('div', {
    class: `cb-bubble ${role}`,
    style: {
      maxWidth: '80%',
      padding: '10px 12px',
      borderRadius: '10px',
      margin: '6px 0',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      backgroundColor: role === 'user' ? '#1a1a1a' : '#2d2d2d',
      color: '#fff',
      alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
      border: role === 'user' ? '1px solid #646cff' : '1px solid #3a3a3a'
    }
  }, text);
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

async function requestNextWord({ apiKey, requiredInitial, usedWords }) {
  const system = [
    '너는 한국어 끝말잇기 도우미야.',
    '규칙:',
    '- 사용자가 낸 마지막 단어의 마지막 글자로 시작하는 단어만 제시해.',
    '- 이미 사용된 단어(중복)는 절대 제시하지 마.',
    '- 고유명사/비속어/외래어 남발 금지, 일반 명사 우선.',
    '- 모호하면 더 흔한 일반 명사를 선택.',
    '- 불가능하면 "없음" 한 단어만 출력.',
    '출력 형식: 반드시 한 단어만. 설명/문장/마침표 금지.'
  ].join('\n');

  const user = [
    `시작 글자: ${requiredInitial}`,
    `이미 사용된 단어: ${usedWords.join(', ') || '없음'}`
  ].join('\n');

  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenAI API 오류: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('응답 파싱 실패');
  return text.replace(/\s+/g, ''); // 안전하게 공백 제거
}

export function setupChatbot(mount) {
  const apiKey = import.meta?.env?.VITE_OPENAI_API_KEY;

  const wrapper = createEl('div', { style: { marginTop: '24px', textAlign: 'left' } });
  const title = createEl('h2', {}, '끝말잇기 챗봇');

  const panel = createEl('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #3a3a3a',
      borderRadius: '12px',
      overflow: 'hidden',
      backgroundColor: '#1e1e1e'
    }
  });

  const messages = createEl('div', {
    id: 'cb-messages',
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '360px',
      overflowY: 'auto',
      padding: '12px',
      gap: '6px'
    }
  });

  const controls = createEl('div', {
    style: {
      display: 'flex',
      gap: '8px',
      padding: '12px',
      borderTop: '1px solid #3a3a3a',
      alignItems: 'center',
      backgroundColor: '#272727'
    }
  });

  const input = createEl('input', {
    type: 'text',
    placeholder: '단어를 입력하세요 (예: 사과)',
    style: {
      flex: '1',
      padding: '10px 12px',
      borderRadius: '8px',
      border: '1px solid #3a3a3a',
      backgroundColor: '#1a1a1a',
      color: '#fff'
    }
  });

  const sendBtn = createEl('button', { type: 'button' }, '전송');
  const resetBtn = createEl('button', { type: 'button', style: { backgroundColor: '#2a2a2a' } }, '새 게임');

  controls.appendChild(input);
  controls.appendChild(sendBtn);
  controls.appendChild(resetBtn);

  panel.appendChild(messages);
  panel.appendChild(controls);

  wrapper.appendChild(title);
  wrapper.appendChild(panel);
  mount.appendChild(wrapper);

  let usedWords = [];
  let waiting = false;

  function resetGame() {
    usedWords = [];
    messages.innerHTML = '';
    renderMessage(messages, 'assistant', '끝말잇기를 시작합니다. 아무 단어나 먼저 입력해 주세요!');
    input.value = '';
    input.focus();
  }

  function validateNextWord(prev, next) {
    if (!next) return { ok: false, reason: '단어가 비어 있어요.' };
    if (/\s/.test(next)) return { ok: false, reason: '공백 없이 한 단어만 입력하세요.' };
    if (usedWords.includes(next)) return { ok: false, reason: '이미 사용된 단어예요.' };
    if (!prev) return { ok: true };
    const need = lastChar(prev);
    if (next[0] !== need) return { ok: false, reason: `시작 글자는 "${need}" 이어야 해요.` };
    return { ok: true };
  }

  async function onSend() {
    if (waiting) return;
    const userText = input.value.trim();
    if (!userText) return;

    const prev = usedWords[usedWords.length - 1] || '';
    const check = validateNextWord(prev, userText);
    if (!check.ok) {
      renderMessage(messages, 'assistant', check.reason);
      return;
    }

    renderMessage(messages, 'user', userText);
    usedWords.push(userText);
    input.value = '';

    const requiredInitial = lastChar(userText);

    if (!apiKey) {
      renderMessage(messages, 'assistant', 'API Key가 설정되지 않았습니다. .env에 VITE_GPT_API_KEY를 설정해 주세요.');
      return;
    }

    waiting = true;
    try {
      const next = await requestNextWord({ apiKey, requiredInitial, usedWords });
      if (next === '없음') {
        renderMessage(messages, 'assistant', '제가 졌어요! 새 게임을 시작해 볼까요?');
        return;
      }
      const dup = usedWords.includes(next);
      const need = requiredInitial;
      const validStart = next && next[0] === need;
      if (dup || !validStart) {
        renderMessage(messages, 'assistant', `규칙 위반 단어가 나왔어요: "${next}". 다시 시도해 주세요.`);
        return;
      }
      usedWords.push(next);
      renderMessage(messages, 'assistant', next);
    } catch (e) {
      renderMessage(messages, 'assistant', `오류가 발생했어요: ${e.message}`);
    } finally {
      waiting = false;
      input.focus();
    }
  }

  sendBtn.addEventListener('click', onSend);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') onSend();
  });
  resetBtn.addEventListener('click', resetGame);

  resetGame();
}

export default { setupChatbot };


