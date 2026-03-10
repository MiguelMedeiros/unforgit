"use client";

import { motion } from "framer-motion";
import { ArrowRight, Download, Plug } from "lucide-react";
import { CodeBlock } from "./code-block";
import Link from "next/link";
import { cn } from "@/lib/utils";

const MCP_CONFIG_BASE64 = "eyJjb21tYW5kIjoidW5mb3JnaXQtbWNwIiwiYXJncyI6W119";
const CURSOR_INSTALL_LINK = `cursor://anysphere.cursor-deeplink/mcp/install?name=unforgit&config=${MCP_CONFIG_BASE64}`;
const VSCODE_INSTALL_LINK = `https://vscode.dev/redirect/mcp/install?name=unforgit&config=${MCP_CONFIG_BASE64}`;

function CursorLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" />
    </svg>
  );
}

function ClaudeLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z" />
    </svg>
  );
}

function VSCodeLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" className={className}>
      <path d="M48 0v55L0 47.84 48 64l16-6.66V6.65zM31.2 9.36L16.5 23.9l-8.85-6.67L4 18.45l9 8.9-9 8.9 3.65 1.22 8.85-6.67 14.7 14.53L40 41.6V13.1zm0 10.37V35l-10.1-7.65z" />
    </svg>
  );
}

function WindsurfLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M23.55 5.067c-1.2038-.002-2.1806.973-2.1806 2.1765v4.8676c0 .972-.8035 1.7594-1.7597 1.7594-.568 0-1.1352-.286-1.4718-.7659l-4.9713-7.1003c-.4125-.5896-1.0837-.941-1.8103-.941-1.1334 0-2.1533.9635-2.1533 2.153v4.8957c0 .972-.7969 1.7594-1.7596 1.7594-.57 0-1.1363-.286-1.4728-.7658L.4076 5.1598C.2822 4.9798 0 5.0688 0 5.2882v4.2452c0 .2147.0656.4228.1884.599l5.4748 7.8183c.3234.462.8006.8052 1.3509.9298 1.3771.313 2.6446-.747 2.6446-2.0977v-4.893c0-.972.7875-1.7593 1.7596-1.7593h.003a1.798 1.798 0 0 1 1.4718.7658l4.9723 7.0994c.4135.5905 1.05.941 1.8093.941 1.1587 0 2.1515-.9645 2.1515-2.153v-4.8948c0-.972.7875-1.7594 1.7596-1.7594h.194a.22.22 0 0 0 .2204-.2202v-4.622a.22.22 0 0 0-.2203-.2203Z" />
    </svg>
  );
}

function CopilotLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M23.922 16.997C23.061 18.492 18.063 22.02 12 22.02 5.937 22.02.939 18.492.078 16.997A.641.641 0 0 1 0 16.741v-2.869a.883.883 0 0 1 .053-.22c.372-.935 1.347-2.292 2.605-2.656.167-.429.414-1.055.644-1.517a10.098 10.098 0 0 1-.052-1.086c0-1.331.282-2.499 1.132-3.368.397-.406.89-.717 1.474-.952C7.255 2.937 9.248 1.98 11.978 1.98c2.731 0 4.767.957 6.166 2.093.584.235 1.077.546 1.474.952.85.869 1.132 2.037 1.132 3.368 0 .368-.014.733-.052 1.086.23.462.477 1.088.644 1.517 1.258.364 2.233 1.721 2.605 2.656a.841.841 0 0 1 .053.22v2.869a.641.641 0 0 1-.078.256Zm-11.75-5.992h-.344a4.359 4.359 0 0 1-.355.508c-.77.947-1.918 1.492-3.508 1.492-1.725 0-2.989-.359-3.782-1.259a2.137 2.137 0 0 1-.085-.104L4 11.746v6.585c1.435.779 4.514 2.179 8 2.179 3.486 0 6.565-1.4 8-2.179v-6.585l-.098-.104s-.033.045-.085.104c-.793.9-2.057 1.259-3.782 1.259-1.59 0-2.738-.545-3.508-1.492a4.359 4.359 0 0 1-.355-.508Zm2.328 3.25c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1-.549 0-1-.451-1-1v-2c0-.549.451-1 1-1Zm-5 0c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1-.549 0-1-.451-1-1v-2c0-.549.451-1 1-1Zm3.313-6.185c.136 1.057.403 1.913.878 2.497.442.544 1.134.938 2.344.938 1.573 0 2.292-.337 2.657-.751.384-.435.558-1.15.558-2.361 0-1.14-.243-1.847-.705-2.319-.477-.488-1.319-.862-2.824-1.025-1.487-.161-2.192.138-2.533.529-.269.307-.437.808-.438 1.578v.021c0 .265.021.562.063.893Zm-1.626 0c.042-.331.063-.628.063-.894v-.02c-.001-.77-.169-1.271-.438-1.578-.341-.391-1.046-.69-2.533-.529-1.505.163-2.347.537-2.824 1.025-.462.472-.705 1.179-.705 2.319 0 1.211.175 1.926.558 2.361.365.414 1.084.751 2.657.751 1.21 0 1.902-.394 2.344-.938.475-.584.742-1.44.878-2.497Z" />
    </svg>
  );
}

const ides = [
  {
    name: "Cursor",
    note: "One-click install",
    icon: CursorLogo,
    href: CURSOR_INSTALL_LINK,
    installLink: true,
  },
  {
    name: "VS Code",
    note: "One-click install",
    icon: VSCodeLogo,
    href: VSCODE_INSTALL_LINK,
    installLink: true,
  },
  {
    name: "GitHub Copilot",
    note: "One-click install",
    icon: CopilotLogo,
    href: VSCODE_INSTALL_LINK,
    installLink: true,
  },
  {
    name: "Claude Desktop",
    note: "macOS / Windows / Linux",
    icon: ClaudeLogo,
    href: "/docs/mcp#mcp-claude-desktop",
    installLink: false,
  },
  {
    name: "Windsurf",
    note: "Global config",
    icon: WindsurfLogo,
    href: "/docs/mcp#mcp-windsurf",
    installLink: false,
  },
  {
    name: "Any MCP client",
    note: "stdio transport",
    icon: null,
    href: "/docs/mcp#mcp-other",
    installLink: false,
  },
];

function TerminalCommand() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="text-center mb-8"
    >
      <CodeBlock code="unforgit init" />
    </motion.div>
  );
}

export function McpIntegrations() {
  return (
    <section id="mcp-integrations" className="py-40 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-gradient-purple">Native in your</span>
            <br />
            <span className="text-dracula-foreground">AI tools</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect via MCP and your AI agent gains persistent memory. No
            shell commands, no context switching. One protocol, every tool.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10"
        >
          {ides.map((ide, i) => {
            const Icon = ide.icon;
            const isExternal =
              ide.href.startsWith("cursor://") ||
              ide.href.startsWith("https://");
            const Wrapper = isExternal ? "a" : Link;
            const wrapperProps = isExternal
              ? { href: ide.href, target: "_blank", rel: "noopener noreferrer" }
              : { href: ide.href };

            return (
              <Wrapper key={ide.name} {...(wrapperProps as any)}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
                  whileHover={{ y: -4, scale: 1.03 }}
                  className="rounded-xl border border-dracula-current/40 bg-dracula-current/20 p-5 flex flex-col items-center gap-3 group hover:border-dracula-comment/60 hover:bg-dracula-current/30 hover:shadow-2xl hover:shadow-white/6 transition-all duration-300 cursor-pointer h-full relative"
                >
                  {ide.installLink && (
                    <span className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-dracula-foreground/10 text-[10px] font-medium text-dracula-foreground/70">
                      <Download className="w-2.5 h-2.5" />
                      Install
                    </span>
                  )}
                  <div className="w-10 h-10 flex items-center justify-center text-dracula-foreground/60 group-hover:text-dracula-foreground transition-colors">
                    {Icon ? (
                      <Icon className="w-8 h-8" />
                    ) : (
                      <Plug className="w-7 h-7" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm text-dracula-foreground">
                      {ide.name}
                    </p>
                    <p className="text-xs text-dracula-comment mt-0.5">
                      {ide.note}
                    </p>
                  </div>
                </motion.div>
              </Wrapper>
            );
          })}
        </motion.div>

        <TerminalCommand />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="text-center"
        >
          <Link
            href="/docs/mcp"
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium",
              "bg-dracula-current/50 border border-dracula-comment/30",
              "hover:bg-dracula-foreground/10 hover:border-dracula-comment/50 transition-all"
            )}
          >
            Setup guide for all IDEs
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
