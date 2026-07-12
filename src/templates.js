export const templates = [
  {
    id: 'construction',
    name: '기본 건설 포스터형',
    description: '진한 남색과 노랑 포인트의 기본 현장 포스터',
    icon: '🏗️',
    colors: ['#0b1f3a', '#ffc928', '#ffffff'],
  },
  {
    id: 'clean-blue',
    name: '깔끔 파란 앱형',
    description: '밝고 신뢰감 있는 파란 카드형',
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
    name: '기본 다크 포스터형',
    description: '고급스러운 다크 네이비와 골드',
    icon: '🛡️',
    colors: ['#061321', '#dcae3d', '#162a3e'],
  },
  {
    id: 'character-construction',
    name: '건설 캐릭터형',
    description: '안전모 캐릭터 느낌과 큰 버튼이 돋보이는 강력 모집형',
    icon: '👷',
    colors: ['#071321', '#ffd22a', '#12345a'],
  },
  {
    id: 'site-poster',
    name: '현장 포스터형',
    description: '모집내용 영역을 넓게 확보한 현장 안내판형',
    icon: '📋',
    colors: ['#10243a', '#f3b51f', '#f7f9fc'],
  },
  {
    id: 'dark-construction',
    name: '다크 프리미엄형',
    description: '어두운 배경과 금색 포인트의 신뢰형 건설 광고',
    icon: '⭐',
    colors: ['#050b14', '#cfa94a', '#10243a'],
  },
  {
    id: 'urgent-recruit',
    name: '긴급 모집형',
    description: '빨강·검정·노랑 대비로 클릭을 유도하는 강조형',
    icon: '🔥',
    colors: ['#c90712', '#111111', '#ffd429'],
  },
]

export function getTemplate(templateId) {
  return templates.find((template) => template.id === templateId) || templates[0]
}
