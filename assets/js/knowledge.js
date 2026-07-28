const search = document.querySelector('#knowledge-search');
const cards = [...document.querySelectorAll('[data-search]')];
const sections = [...document.querySelectorAll('[data-knowledge-section]')];
const empty = document.querySelector('#knowledge-empty');

const normalise = (value) => String(value).toLocaleLowerCase('ja').normalize('NFKC').trim();

function filterKnowledge() {
  const query = normalise(search?.value ?? '');
  const terms = query.split(/\s+/).filter(Boolean);
  let visibleCount = 0;

  for (const card of cards) {
    const haystack = normalise(`${card.dataset.search ?? ''} ${card.textContent ?? ''}`);
    const visible = terms.length === 0 || terms.every((term) => haystack.includes(term));
    card.hidden = !visible;
    if (visible) visibleCount += 1;
  }

  let visibleSectionCount = 0;
  for (const section of sections) {
    const searchable = [...section.querySelectorAll('[data-search]')];
    if (terms.length === 0) {
      section.hidden = false;
      continue;
    }
    if (searchable.length > 0) {
      section.hidden = searchable.every((item) => item.hidden);
    } else {
      const sectionText = normalise(section.textContent ?? '');
      section.hidden = !terms.every((term) => sectionText.includes(term));
    }
    if (!section.hidden) visibleSectionCount += 1;
  }

  if (empty) empty.hidden = visibleCount > 0 || visibleSectionCount > 0 || terms.length === 0;
}

search?.addEventListener('input', filterKnowledge);
