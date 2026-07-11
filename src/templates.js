export const templates = [
  {
    id: 'construction',
    name: '기본 건설 포스터형',
    description: '남색과 안전 노랑의 현장 포스터',
    icon: '🏗️',
    colors: ['#0b1f3a', '#ffc928', '#ffffff'],
  },
  {
    id: 'clean-blue',
    name: '깔끔 파란 앱형',
    description: '밝고 신뢰감 있는 블루 카드',
    icon: '🏢',
    colors: ['#1664d9', '#edf5ff', '#ffffff'],
  },
  {
    id: 'urgent-red',
    name: '긴급 빨간형',
    description: '시선을 끄는 긴급 모집 포스터',
    icon: '🚨',
    colors: ['#d90916', '#111111', '#ffd400'],
  },
  {
    id: 'dark-premium',
    name: '다크 프리미엄형',
    description: '고급스러운 다크 네이비와 골드',
    icon: '🛡️',
    colors: ['#061321', '#dcae3d', '#162a3e'],
  },
  {
    id: 'character-construction',
    name: '건설 캐릭터형',
    description: '작업자 캐릭터와 골드 포인트가 돋보이는 모집 광고',
    icon: '👷',
    colors: ['#061321', '#f0bd31', '#1b8bff'],
  },
  {
    id: 'character-urgent',
    name: '긴급모집 캐릭터형',
    description: '철판 간판과 긴급 모집 분위기의 강한 현장형',
    icon: '⛓️',
    colors: ['#101a27', '#ffbd21', '#1fb463'],
  },
  {
    id: 'character-premium',
    name: '프리미엄 캐릭터형',
    description: '레드·블랙 대비와 캐릭터 강조가 큰 프리미엄형',
    icon: '🔥',
    colors: ['#080808', '#d90916', '#ffd42a'],
  },
  {
    id: 'site-signboard',
    name: '현장 안내판형',
    description: '대형 현장 안내판과 안전 강조 요소를 담은 템플릿',
    icon: '🚧',
    colors: ['#061321', '#f4b51f', '#0c8745'],
  },
]

export function getTemplate(templateId) {
  return templates.find((template) => template.id === templateId) || templates[0]
}
