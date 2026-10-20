export interface CheatChild { id: string; title: string; body: string; }
export interface CheatSection { id: string; title: string; body: string; children: CheatChild[]; }

function slug(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function parseCheatSheet(markdown: string): CheatSection[] {
  const lines = markdown.replace(/^# [^\n]*\n/, '').split('\n');
  const sections: { title: string; lines: string[] }[] = [];
  let current: { title: string; lines: string[] } | null = null;
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      current = { title: heading[1].trim(), lines: [] };
      sections.push(current);
    } else if (current) current.lines.push(line);
  }

  return sections.map(section => {
    const groups: { title: string; lines: string[] }[] = [{ title: 'Tóm tắt', lines: [] }];
    for (const line of section.lines) {
      if (!line.trim()) continue;
      let title: string | undefined;
      let content = line;
      const bold = line.match(/^\s*(?:[-*]\s*)?\*\*([^*]+)\*\*\s*:?[ \t]*(.*)$/);
      const numbered = line.match(/^\s*\d+\.\s+(.+)$/);
      const table = line.match(/^\s*\|\s*([^|]+?)\s*\|/);
      const simpleLabel = line.match(/^\s*[-*]\s+([^:|]{2,80}):\s*(.*)$/);
      if (bold) {
        title = bold[1].replace(/:$/, '').trim();
        content = bold[2] ? `${bold[1].endsWith(':') ? '' : '**'}${bold[2]}` : line;
      } else if (numbered) {
        title = numbered[1].trim();
      } else if (table && !/^[-: ]+$/.test(table[1])) {
        const firstCell = table[1].trim();
        if (!['metric', 'chỉ số'].includes(firstCell.toLowerCase())) title = firstCell;
      } else if (simpleLabel) {
        title = simpleLabel[1].trim();
        content = simpleLabel[2];
      }
      if (title) groups.push({ title, lines: [content] });
      else groups[groups.length - 1].lines.push(line);
    }
    const children = groups.filter(group => group.lines.length).map((group, index) => ({
      id: `${slug(section.title)}-${slug(group.title)}-${index}`,
      title: group.title,
      body: group.lines.join('\n').trim(),
    }));
    return { id: slug(section.title), title: section.title, body: section.lines.join('\n').trim(), children };
  });
}
