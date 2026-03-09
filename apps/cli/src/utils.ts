import readline from "node:readline";

export function truncate(text: string, maxLength: number): string {
  const singleLine = text.replace(/\n/g, " ").trim();
  if (singleLine.length <= maxLength) return singleLine;
  return singleLine.slice(0, maxLength - 3) + "...";
}

export function maskKey(key: string): string {
  if (key.length <= 10) return "***";
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

export function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "yes");
    });
  });
}

let jsonMode = false;

export function setJsonMode(enabled: boolean): void {
  jsonMode = enabled;
}

export function isJsonMode(): boolean {
  return jsonMode;
}

export function outputJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function paginate<T>(items: T[], page: number, perPage: number): { items: T[]; totalPages: number; currentPage: number; total: number } {
  const total = items.length;
  const totalPages = Math.ceil(total / perPage);
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    totalPages,
    currentPage,
    total,
  };
}
