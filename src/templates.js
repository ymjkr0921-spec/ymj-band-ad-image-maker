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
]

export function getTemplate(templateId) {
  return templates.find((template) => template.id === templateId) || templates[0]
}
