// Indonesian translations of short quotations, with traceable source links.
// Kept locally so inspiration never blocks login or depends on a third-party API.
import { ADDITIONAL_WORK_QUOTES } from './additionalWorkQuotes.js';
import { MOTIVATIONAL_WORK_QUOTES } from './motivationalWorkQuotes.js';

export const WORK_QUOTES = [
  {
    id: 'jobs-work',
    text: 'Satu-satunya cara untuk menghasilkan karya hebat adalah mencintai apa yang kamu kerjakan.',
    author: 'Steve Jobs',
    role: 'Pendiri Apple',
    topic: 'Bekerja dengan hati',
    source: 'Pidato Stanford, 2005',
    url: 'https://news.stanford.edu/stories/2005/06/youve-got-find-love-jobs-says',
  },
  {
    id: 'keller-together',
    text: 'Sendirian kita hanya bisa melakukan sedikit; bersama-sama kita bisa melakukan begitu banyak.',
    author: 'Helen Keller',
    role: 'Penulis & aktivis',
    topic: 'Kekuatan kerja sama',
    source: 'American Foundation for the Blind',
    url: 'https://afb.org/about-afb/history/helen-keller/quotes/helen-keller-quotes-progress',
  },
  {
    id: 'edison-effort',
    text: 'Kejeniusan adalah satu persen inspirasi dan sembilan puluh sembilan persen kerja keras.',
    author: 'Thomas A. Edison',
    role: 'Penemu & pengusaha',
    topic: 'Usaha yang berarti',
    source: 'Thomas Edison · National Park Service',
    url: 'https://www.nps.gov/edis/learn/kidsyouth/a-brief-biography-of-thomas-edison.htm',
  },
  {
    id: 'ford-improvement',
    text: 'Bisnis yang tumbuh melalui pengembangan dan perbaikan tidak akan mati.',
    author: 'Henry Ford',
    role: 'Pendiri Ford Motor Company',
    topic: 'Terus menjadi lebih baik',
    source: 'The Henry Ford · Ford News, 1923',
    url: 'https://www.thehenryford.org/collections/explore/popular-research-topics/henry-ford-quotations',
  },
  {
    id: 'ford-purpose',
    text: 'Tidak ada kegagalan selain gagal menjalankan tujuan yang ingin kita capai.',
    author: 'Henry Ford',
    role: 'Pendiri Ford Motor Company',
    topic: 'Langkah yang punya tujuan',
    source: 'The Henry Ford · Ford News, 1923',
    url: 'https://www.thehenryford.org/collections/explore/popular-research-topics/henry-ford-quotations',
  },
  ...MOTIVATIONAL_WORK_QUOTES,
  ...ADDITIONAL_WORK_QUOTES,
];

export const QUOTE_INTERVAL_MS = 30000;

export function createQuoteOrder(previousId) {
  const order = WORK_QUOTES.map((_, index) => index);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (WORK_QUOTES[order[0]].id === previousId) {
    [order[0], order[1]] = [order[1], order[0]];
  }
  return order;
}
