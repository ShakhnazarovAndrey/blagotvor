const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
export const fmtDate = (d: Date) => `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
export const fmtShort = (d: Date) => d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
export const fmtMoney = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₽';
/** убирает эмодзи в начале заголовка, чтобы красиво выводить в карточках */
export const cleanTitle = (t: string) => t.replace(/^[\p{Extended_Pictographic}️‍\s]+/u, '').trim();
export const leadEmoji = (t: string) => (t.match(/^([\p{Extended_Pictographic}️‍]+)/u) || [])[1] ?? '';
export const excerpt = (body: string, len = 160) => {
  const t = body.replace(/[#>*_\-]/g, '').replace(/\s+/g, ' ').trim();
  return t.length > len ? t.slice(0, len).replace(/\s+\S*$/, '') + '…' : t;
};
