const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

// 디버깅용: 현재 로드된 Vite 환경변수 키를 콘솔에 출력
// (빌드 산출물에는 실제 키 값이 포함되므로, 민감한 정보는 항상 .env / Netlify 환경변수로만 관리하세요)
if (typeof import.meta !== 'undefined' && import.meta.env) {
  // eslint-disable-next-line no-console
  console.log(
    '[MathChatbot] 사용 가능한 env 키:',
    Object.keys(import.meta.env).filter((k) => k.startsWith('VITE_'))
  );
}

export async function fetchMathDefinition(term) {
  const apiKey =
    import.meta?.env?.VITE_OPENAI_API_KEY ||
    import.meta?.env?.VITE_GPT_API_KEY;
  if (!apiKey) {
    throw new Error('.env에 VITE_OPENAI_API_KEY 또는 VITE_GPT_API_KEY를 설정하고 개발 서버를 재시작하세요.');
  }

  const systemPrompt = [
    '너는 수학 용어 사전 챗봇이야.',
    '사용자가 입력한 수학 관련 용어를 간결하게 정의하고, 실생활이나 수학 문제에서의 사용 예시를 하나 제공해.',
    '정의와 예시는 각각 별도 문장으로 작성해.',
    '모를 경우 추측하지 말고 "정의를 찾을 수 없습니다."라고 답하고, 예시 대신 "예시를 찾을 수 없습니다."라고 알려줘.',
    '출력 형식은 반드시 JSON 문자열이어야 하며, 필드는 "definition"과 "example" 두 개로 구성해.'
  ].join('\n');

  const userPrompt = `질문 용어: ${term}`;

  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenAI API 오류: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('응답 파싱 실패');
  }

  try {
    const parsed = JSON.parse(content);
    return {
      definition: parsed.definition || '정의를 찾을 수 없습니다.',
      example: parsed.example || '예시를 찾을 수 없습니다.'
    };
  } catch (e) {
    return {
      definition: content,
      example: '예시를 찾을 수 없습니다.'
    };
  }
}

export default { fetchMathDefinition };

