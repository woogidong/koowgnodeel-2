import { fetchMathDefinition } from './api.js';

function createEl(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v);
  });
  const arr = Array.isArray(children) ? children : [children];
  arr.forEach((child) => {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child) el.appendChild(child);
  });
  return el;
}

function createSkeleton() {
  const holder = createEl('div', {
    class: 'skeleton',
    style: {
      width: '100%',
      height: '14px',
      backgroundColor: '#2e2e2e',
      borderRadius: '4px',
      marginBottom: '8px'
    }
  });
  return holder;
}

export function setupChatbot(mount) {
  const wrapper = createEl('div', {
    style: {
      marginTop: '24px',
      textAlign: 'left',
      color: '#f2f2f2'
    }
  });

  const title = createEl('h2', {}, '수학 용어 정의 챗봇');
  const subtitle = createEl('p', {
    style: { color: '#b4b4b4', marginTop: '-12px' }
  }, '수학 용어를 입력하면 정의와 예시를 알려드려요.');

  const panel = createEl('div', {
    style: {
      border: '1px solid #343434',
      borderRadius: '16px',
      backgroundColor: '#1b1b1b',
      overflow: 'hidden',
      boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
    }
  });

  const output = createEl('div', {
    id: 'math-output',
    style: {
      minHeight: '220px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }
  });

  const controls = createEl('div', {
    style: {
      display: 'flex',
      gap: '10px',
      padding: '16px',
      borderTop: '1px solid #343434',
      backgroundColor: '#232323'
    }
  });

  const input = createEl('input', {
    type: 'text',
    placeholder: '예: 미분, 행렬식, 확률 변수',
    style: {
      flex: 1,
      padding: '12px 14px',
      borderRadius: '10px',
      border: '1px solid #3a3a3a',
      backgroundColor: '#151515',
      color: '#fefefe'
    }
  });

  const button = createEl('button', {
    type: 'button',
    style: {
      padding: '12px 18px',
      borderRadius: '10px',
      border: 'none',
      backgroundColor: '#646cff',
      color: '#fff',
      fontWeight: '600',
      cursor: 'pointer'
    }
  }, '검색');

  const status = createEl('span', {
    style: {
      marginLeft: 'auto',
      color: '#9c9c9c',
      fontSize: '0.9rem'
    }
  });

  controls.appendChild(input);
  controls.appendChild(button);
  controls.appendChild(status);

  panel.appendChild(output);
  panel.appendChild(controls);

  wrapper.appendChild(title);
  wrapper.appendChild(subtitle);
  wrapper.appendChild(panel);
  mount.appendChild(wrapper);

  function setLoading(isLoading) {
    status.textContent = isLoading ? '검색 중...' : '';
    button.disabled = isLoading;
    button.style.opacity = isLoading ? '0.6' : '1';
  }

  function renderResult({ term, definition, example }) {
    output.innerHTML = '';
    const termLabel = createEl('div', {
      style: { fontSize: '1.1rem', fontWeight: '600', color: '#dcdcdc' }
    }, `용어: ${term}`);

    const defBlock = createEl('div', {}, [
      createEl('h3', {
        style: { marginBottom: '6px', fontSize: '1rem', color: '#9fd6ff' }
      }, '정의'),
      createEl('p', {
        style: { margin: 0, lineHeight: '1.5' }
      }, definition)
    ]);

    const exBlock = createEl('div', {}, [
      createEl('h3', {
        style: { marginBottom: '6px', fontSize: '1rem', color: '#9fd6ff' }
      }, '사용 예시'),
      createEl('p', {
        style: { margin: 0, lineHeight: '1.5' }
      }, example)
    ]);

    output.appendChild(termLabel);
    output.appendChild(defBlock);
    output.appendChild(exBlock);
  }

  function renderPlaceholder() {
    output.innerHTML = '';
    output.appendChild(createEl('p', {
      style: { color: '#bfbfbf' }
    }, '수학 용어를 입력해 정의와 예시를 확인해 보세요.'));
  }

  function renderError(message) {
    output.innerHTML = '';
    output.appendChild(createEl('p', {
      style: { color: '#ff8a8a' }
    }, message));
  }

  function renderLoadingSkeleton() {
    output.innerHTML = '';
    const skeletons = createEl('div', { style: { width: '100%' } });
    for (let i = 0; i < 4; i++) {
      skeletons.appendChild(createSkeleton());
    }
    output.appendChild(skeletons);
  }

  async function searchTerm() {
    const term = input.value.trim();
    if (!term) {
      renderError('검색할 수학 용어를 입력해 주세요.');
      return;
    }
    setLoading(true);
    renderLoadingSkeleton();
    try {
      const { definition, example } = await fetchMathDefinition(term);
      renderResult({ term, definition, example });
    } catch (err) {
      renderError(err.message);
    } finally {
      setLoading(false);
    }
  }

  button.addEventListener('click', searchTerm);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchTerm();
  });

  renderPlaceholder();
}

export default { setupChatbot };
