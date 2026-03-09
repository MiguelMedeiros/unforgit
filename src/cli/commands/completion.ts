import { Command } from "commander";
import { logger } from "../logger.js";

const BASH_COMPLETION = `
_unforgit_completions() {
  local cur prev commands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  commands="init add recall promote consolidate deprecate supersede delete restore web link unlink links merge remerge similar history auto-consolidate unconsolidate status push pull remote log diff keys auth config embeddings reset doctor curate completion"

  case "\${prev}" in
    unforgit)
      COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
      return 0
      ;;
    remote)
      COMPREPLY=( $(compgen -W "add remove set-url show" -- "\${cur}") )
      return 0
      ;;
    keys)
      COMPREPLY=( $(compgen -W "create list revoke" -- "\${cur}") )
      return 0
      ;;
    auth)
      COMPREPLY=( $(compgen -W "set status remove openai openai-remove" -- "\${cur}") )
      return 0
      ;;
    config)
      COMPREPLY=( $(compgen -W "list get set unset" -- "\${cur}") )
      return 0
      ;;
    embeddings)
      COMPREPLY=( $(compgen -W "backfill stats clear" -- "\${cur}") )
      return 0
      ;;
    --type)
      COMPREPLY=( $(compgen -W "episodic semantic procedural" -- "\${cur}") )
      return 0
      ;;
  esac

  if [[ "\${cur}" == -* ]]; then
    COMPREPLY=( $(compgen -W "--verbose --quiet --json --help --version" -- "\${cur}") )
    return 0
  fi
}
complete -F _unforgit_completions unforgit
`.trim();

const ZSH_COMPLETION = `
#compdef unforgit

_unforgit() {
  local -a commands
  commands=(
    'init:Initialize Unforgit in the current repository'
    'add:Add a memory'
    'recall:Recall memories matching a query'
    'promote:Promote a local memory to remote'
    'consolidate:Consolidate episodic memories'
    'deprecate:Mark a memory as deprecated'
    'supersede:Mark a memory as superseded'
    'delete:Soft delete a memory'
    'restore:Restore a soft-deleted memory'
    'web:Start the web dashboard'
    'link:Create a link between memories'
    'unlink:Remove a link between memories'
    'links:List links for a memory'
    'merge:Consolidate multiple local memories'
    'remerge:Update an existing consolidation'
    'similar:Find similar memories'
    'history:Show consolidation history'
    'auto-consolidate:AI-powered consolidation'
    'unconsolidate:Revert a consolidation'
    'status:Show sync status'
    'push:Push local memories to remote'
    'pull:Pull remote memories to local'
    'remote:Manage remotes'
    'log:Show memory history log'
    'diff:Show differences between local and remote'
    'keys:Manage API keys'
    'auth:Configure authentication'
    'config:Manage configuration'
    'embeddings:Manage embeddings'
    'reset:Delete all memories'
    'doctor:Check system health'
    'curate:Preview or run lifecycle maintenance'
    'completion:Generate shell completions'
  )

  _arguments -C \\
    '--verbose[Enable verbose output]' \\
    '--quiet[Suppress non-essential output]' \\
    '--json[Output as JSON]' \\
    '--help[Show help]' \\
    '--version[Show version]' \\
    '1: :->cmd' \\
    '*::arg:->args'

  case "\$state" in
    cmd)
      _describe 'command' commands
      ;;
  esac
}

_unforgit "\$@"
`.trim();

const FISH_COMPLETION = `
complete -c unforgit -f
complete -c unforgit -n '__fish_use_subcommand' -a 'init' -d 'Initialize Unforgit'
complete -c unforgit -n '__fish_use_subcommand' -a 'add' -d 'Add a memory'
complete -c unforgit -n '__fish_use_subcommand' -a 'recall' -d 'Recall memories'
complete -c unforgit -n '__fish_use_subcommand' -a 'promote' -d 'Promote to remote'
complete -c unforgit -n '__fish_use_subcommand' -a 'consolidate' -d 'Consolidate memories'
complete -c unforgit -n '__fish_use_subcommand' -a 'deprecate' -d 'Deprecate a memory'
complete -c unforgit -n '__fish_use_subcommand' -a 'supersede' -d 'Supersede a memory'
complete -c unforgit -n '__fish_use_subcommand' -a 'delete' -d 'Delete a memory'
complete -c unforgit -n '__fish_use_subcommand' -a 'restore' -d 'Restore a memory'
complete -c unforgit -n '__fish_use_subcommand' -a 'web' -d 'Start web dashboard'
complete -c unforgit -n '__fish_use_subcommand' -a 'link' -d 'Link two memories'
complete -c unforgit -n '__fish_use_subcommand' -a 'unlink' -d 'Unlink memories'
complete -c unforgit -n '__fish_use_subcommand' -a 'links' -d 'List links'
complete -c unforgit -n '__fish_use_subcommand' -a 'merge' -d 'Merge memories'
complete -c unforgit -n '__fish_use_subcommand' -a 'remerge' -d 'Update consolidation'
complete -c unforgit -n '__fish_use_subcommand' -a 'similar' -d 'Find similar memories'
complete -c unforgit -n '__fish_use_subcommand' -a 'history' -d 'Consolidation history'
complete -c unforgit -n '__fish_use_subcommand' -a 'auto-consolidate' -d 'AI consolidation'
complete -c unforgit -n '__fish_use_subcommand' -a 'unconsolidate' -d 'Revert consolidation'
complete -c unforgit -n '__fish_use_subcommand' -a 'status' -d 'Show sync status'
complete -c unforgit -n '__fish_use_subcommand' -a 'push' -d 'Push to remote'
complete -c unforgit -n '__fish_use_subcommand' -a 'pull' -d 'Pull from remote'
complete -c unforgit -n '__fish_use_subcommand' -a 'remote' -d 'Manage remotes'
complete -c unforgit -n '__fish_use_subcommand' -a 'log' -d 'Memory log'
complete -c unforgit -n '__fish_use_subcommand' -a 'diff' -d 'Show differences'
complete -c unforgit -n '__fish_use_subcommand' -a 'keys' -d 'Manage API keys'
complete -c unforgit -n '__fish_use_subcommand' -a 'auth' -d 'Configure auth'
complete -c unforgit -n '__fish_use_subcommand' -a 'config' -d 'Manage config'
complete -c unforgit -n '__fish_use_subcommand' -a 'embeddings' -d 'Manage embeddings'
complete -c unforgit -n '__fish_use_subcommand' -a 'reset' -d 'Delete all memories'
complete -c unforgit -n '__fish_use_subcommand' -a 'doctor' -d 'Check system health'
complete -c unforgit -n '__fish_use_subcommand' -a 'curate' -d 'Preview or run lifecycle maintenance'
complete -c unforgit -n '__fish_use_subcommand' -a 'completion' -d 'Generate completions'
complete -c unforgit -l verbose -d 'Enable verbose output'
complete -c unforgit -l quiet -d 'Suppress non-essential output'
complete -c unforgit -l json -d 'Output as JSON'
`.trim();

export const completionCommand = new Command("completion")
  .description("Generate shell completion scripts")
  .argument("<shell>", "Shell type (bash, zsh, fish)")
  .addHelpText("after", `
Examples:
  unforgit completion bash >> ~/.bashrc
  unforgit completion zsh >> ~/.zshrc
  unforgit completion fish > ~/.config/fish/completions/unforgit.fish`)
  .action((shell: string) => {
    switch (shell.toLowerCase()) {
      case "bash":
        console.log(BASH_COMPLETION);
        break;
      case "zsh":
        console.log(ZSH_COMPLETION);
        break;
      case "fish":
        console.log(FISH_COMPLETION);
        break;
      default:
        logger.error(`Unsupported shell: ${shell}. Use bash, zsh, or fish.`);
        process.exit(1);
    }
  });
