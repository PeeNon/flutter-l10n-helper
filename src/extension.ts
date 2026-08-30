import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { FlutterProjectDetector } from "./project/flutterProjectDetector";
import { ArbParser } from "./arb/arbParser";
import { TranslationIndex } from "./arb/translationIndex";
import { ExtensionConfig } from "./configuration/extensionConfig";
import { InlineDecorationProvider } from "./providers/inlineDecorationProvider";
import { HoverProvider } from "./providers/hoverProvider";
import { DefinitionProvider } from "./providers/definitionProvider";
import { CompletionProvider } from "./providers/completionProvider";
import { CodeActionProvider } from "./providers/codeActionProvider";
import { Aragnostics } from "./diagnostics/arbDiagnostics";
import { DartDiagnostics } from "./diagnostics/dartDiagnostics";
import { PlaceholderValidator } from "./diagnostics/placeholderValidator";
import { FileWatcher } from "./workspace/fileWatcher";
import { RefreshCoordinator } from "./workspace/refreshCoordinator";
import { AddTranslationKeyCommand } from "./commands/addTranslationKey";
import { ExtractToArbCommand } from "./commands/extractToArb";
import { RenameTranslationKeyCommand } from "./commands/renameTranslationKey";
import { FindUnusedKeysCommand } from "./commands/findUnusedKeys";
import { ShowTranslationReportCommand } from "./commands/showTranslationReport";
import { LocalizationProject } from "./arb/arbModels";

let translationIndex = new TranslationIndex();
let inlineProvider: InlineDecorationProvider;
let hoverProviderInst: HoverProvider;
let definitionProviderInst: DefinitionProvider;
let completionProviderInst: CompletionProvider;
let codeActionProviderInst: CodeActionProvider;
let arbDiagnostics: Aragnostics;
let dartDiagnostics: DartDiagnostics;
let fileWatcher: FileWatcher;
let refreshCoordinator: RefreshCoordinator;
let addKeyCmd: AddTranslationKeyCommand;
let extractCmd: ExtractToArbCommand;
let renameCmd: RenameTranslationKeyCommand;
let findUnusedCmd: FindUnusedKeysCommand;
let reportCmd: ShowTranslationReportCommand;
const arbParser = new ArbParser();
const detector = new FlutterProjectDetector();
const config = new ExtensionConfig();
let currentProject: LocalizationProject | undefined;

function getProject(): LocalizationProject | undefined {
  return currentProject;
}

async function detectAndIndex(
  workspaceFolder?: vscode.WorkspaceFolder
): Promise<LocalizationProject | undefined> {
  const folders = workspaceFolder
    ? [workspaceFolder]
    : vscode.workspace.workspaceFolders || [];

  for (const folder of folders) {
    const project = await detector.detectProject(folder);
    if (project) {
      currentProject = project;
      translationIndex.clear();
      const arbFiles = fs
        .readdirSync(project.arbDirectoryUri)
        .filter((f) => f.endsWith(".arb") && !f.startsWith("@"));

      for (const arbFile of arbFiles) {
        const filePath = path.join(project.arbDirectoryUri, arbFile);
        const content = fs.readFileSync(filePath, "utf-8");
        const parsed = arbParser.parseArbFile(filePath, content);
        translationIndex.addParsedFile(parsed);
      }

      translationIndex.setTemplateLocale(project.templateLocale);
      return project;
    }
  }
  currentProject = undefined;
  return undefined;
}

function updateAllProviders(): void {
  inlineProvider?.updateTranslationIndex(translationIndex);
  inlineProvider?.updateAllDecorations();
  hoverProviderInst?.updateTranslationIndex(translationIndex);
  definitionProviderInst?.updateTranslationIndex(translationIndex);
  completionProviderInst?.updateTranslationIndex(translationIndex);
  codeActionProviderInst?.updateTranslationIndex(translationIndex);
  dartDiagnostics?.updateTranslationIndex(translationIndex);
  dartDiagnostics?.validateAllOpenDocuments();
  addKeyCmd?.updateTranslationIndex(translationIndex);
  extractCmd?.updateTranslationIndex(translationIndex);
  renameCmd?.updateTranslationIndex(translationIndex);
  findUnusedCmd?.updateTranslationIndex(translationIndex);
  reportCmd?.updateTranslationIndex(translationIndex);
}

export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  const settings = config.getSettings();
  if (!settings.enabled) {
    return;
  }

  await detectAndIndex();

  inlineProvider = new InlineDecorationProvider(
    translationIndex,
    settings.displayLocale,
    settings.inlineAnnotationsMaxLength
  );
  hoverProviderInst = new HoverProvider(translationIndex);
  definitionProviderInst = new DefinitionProvider(translationIndex);
  completionProviderInst = new CompletionProvider(
    translationIndex,
    settings.displayLocale
  );
  codeActionProviderInst = new CodeActionProvider(translationIndex, getProject);
  arbDiagnostics = new Aragnostics();
  dartDiagnostics = new DartDiagnostics(translationIndex, config);
  refreshCoordinator = new RefreshCoordinator(300);
  addKeyCmd = new AddTranslationKeyCommand(translationIndex, getProject);
  extractCmd = new ExtractToArbCommand(translationIndex, getProject);
  renameCmd = new RenameTranslationKeyCommand(translationIndex, getProject);
  findUnusedCmd = new FindUnusedKeysCommand(translationIndex, getProject);
  reportCmd = new ShowTranslationReportCommand(translationIndex);

  fileWatcher = new FileWatcher(refreshCoordinator, async () => {
    await detectAndIndex();
    updateAllProviders();
  });
  fileWatcher.startWatching();

  context.subscriptions.push(
    vscode.languages.registerHoverProvider("dart", hoverProviderInst)
  );
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider("dart", definitionProviderInst)
  );
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      "dart",
      completionProviderInst,
      "."
    )
  );
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      "dart",
      codeActionProviderInst,
      {
        providedCodeActionKinds:
          CodeActionProvider.providedCodeActionKinds,
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("flutterL10n.showProjectInfo", async () => {
      const project = await detectAndIndex();
      if (!project) {
        vscode.window.showWarningMessage(
          "Flutter L10n Helper: No Flutter localization project detected."
        );
        return;
      }

      const missing = translationIndex.getMissingTranslations();
      const totalMissing = missing.reduce(
        (sum, item) => sum + item.missingLocales.length,
        0
      );

      const message = [
        `Flutter L10n project detected`,
        ``,
        `ARB directory: ${path.relative(
          project.rootUri,
          project.arbDirectoryUri
        )}`,
        `Template file: ${project.templateArbFile}`,
        `Template locale: ${project.templateLocale}`,
        `Supported locales: ${project.supportedLocales.join(", ")}`,
        `Translation keys: ${translationIndex.translationCount}`,
        `Missing translations: ${totalMissing}`,
      ].join("\n");

      vscode.window.showInformationMessage(message, { modal: true });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "flutterL10n.refreshTranslationIndex",
      async () => {
        await detectAndIndex();
        updateAllProviders();
        vscode.window.showInformationMessage(
          "Flutter L10n Helper: Translation index refreshed."
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "flutterL10n.selectDisplayLocale",
      async () => {
        const locales = translationIndex.supportedLocales;
        if (locales.length === 0) {
          vscode.window.showWarningMessage(
            "Flutter L10n Helper: No locales detected."
          );
          return;
        }

        const selected = await vscode.window.showQuickPick(locales, {
          placeHolder: "Select a locale for inline annotations",
        });

        if (selected) {
          const cfg = vscode.workspace.getConfiguration("flutterL10n");
          await cfg.update(
            "displayLocale",
            selected,
            vscode.ConfigurationTarget.Global
          );
          inlineProvider?.updateSettings(
            selected,
            config.getSettings().inlineAnnotationsMaxLength
          );
          completionProviderInst?.updateDisplayLocale(selected);
          inlineProvider?.updateAllDecorations();
          vscode.window.showInformationMessage(
            `Flutter L10n Helper: Display locale set to "${selected}".`
          );
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "flutterL10n.addTranslationKey",
      (key?: string) => addKeyCmd.execute(key)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "flutterL10n.extractToArb",
      () => extractCmd.execute()
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "flutterL10n.renameTranslationKey",
      (key?: string) => renameCmd.execute(key)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "flutterL10n.findUnusedKeys",
      () => findUnusedCmd.execute()
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "flutterL10n.showTranslationReport",
      () => reportCmd.execute()
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "flutterL10n.findMissingTranslations",
      () => {
        const missing = translationIndex.getMissingTranslations();
        if (missing.length === 0) {
          vscode.window.showInformationMessage(
            "Flutter L10n Helper: All translations are complete!"
          );
          return;
        }

        const message = missing
          .map(
            (item) =>
              `${item.key}: missing ${item.missingLocales.join(", ")}`
          )
          .join("\n");

        vscode.window.showInformationMessage(
          `Missing translations (${missing.length} keys):\n\n${message}`,
          { modal: true }
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "flutterL10n.copyKey",
      (key: string) => {
        vscode.env.clipboard.writeText(key);
        vscode.window.showInformationMessage(
          `Flutter L10n Helper: Copied "${key}" to clipboard.`
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "flutterL10n.openTemplate",
      async (key: string) => {
        const entry = translationIndex.getEntry(key);
        if (!entry) {
          return;
        }

        const templateLocale = translationIndex.templateLocale;
        const templateValue = entry.values.get(templateLocale);
        if (!templateValue) {
          return;
        }

        const filePath = templateValue.fileUri;
        if (!fs.existsSync(filePath)) {
          return;
        }

        const doc = await vscode.workspace.openTextDocument(
          vscode.Uri.file(filePath)
        );
        const text = doc.getText();
        const regex = new RegExp(
          `"${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*:`,
          "g"
        );
        const match = regex.exec(text);
        if (match) {
          const pos = doc.positionAt(match.index);
          const editor = await vscode.window.showTextDocument(doc);
          editor.selection = new vscode.Selection(pos, pos);
          editor.revealRange(new vscode.Range(pos, pos));
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "flutterL10n.addMetadata",
      async (key: string) => {
        const project = getProject();
        if (!project) {
          return;
        }

        const templateLocale = translationIndex.templateLocale;
        const arbFiles = fs
          .readdirSync(project.arbDirectoryUri)
          .filter((f) => f.endsWith(".arb") && !f.startsWith("@"));

        const templateFile = arbFiles.find((f) => {
          const locale = detector.extractLocaleFromFileName(f);
          return locale === templateLocale;
        });

        if (!templateFile) {
          return;
        }

        const filePath = path.join(project.arbDirectoryUri, templateFile);
        const content = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(content) as Record<string, unknown>;

        const metaKey = `@${key}`;
        if (!parsed.hasOwnProperty(metaKey)) {
          parsed[metaKey] = {
            description: `TODO: Add description for ${key}`,
          };

          const newContent = JSON.stringify(parsed, null, 2) + "\n";
          const edit = new vscode.WorkspaceEdit();
          edit.replace(
            vscode.Uri.file(filePath),
            new vscode.Range(0, 0, Infinity, 0),
            newContent
          );
          await vscode.workspace.applyEdit(edit);
          vscode.window.showInformationMessage(
            `Flutter L10n Helper: Added metadata for "${key}".`
          );
        }
      }
    )
  );

  vscode.window.onDidChangeVisibleTextEditors(
    (editors) => {
      for (const editor of editors) {
        inlineProvider?.updateDecorations(editor);
      }
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (event.document.languageId === "dart") {
        const diagnostics = dartDiagnostics?.validateDocument(event.document);
        if (diagnostics) {
          dartDiagnostics.updateDiagnostics(event.document, diagnostics);
        }
      }
      if (event.document.fileName.endsWith(".arb")) {
        const diagnostics = arbDiagnostics?.validateArbFile(
          event.document,
          event.document.getText()
        );
        if (diagnostics) {
          arbDiagnostics.updateDiagnostics(event.document, diagnostics);
        }
      }
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document === event.document) {
        inlineProvider?.updateDecorations(editor);
      }
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onDidSaveTextDocument(
    async (document) => {
      const fileName = document.fileName;
      if (fileName.endsWith(".arb") || fileName.endsWith("l10n.yaml")) {
        refreshCoordinator.scheduleRefresh(async () => {
          await detectAndIndex();
          updateAllProviders();
        });
      }
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onDidChangeConfiguration(
    async (event) => {
      if (event.affectsConfiguration("flutterL10n")) {
        const newSettings = config.getSettings();
        inlineProvider?.updateSettings(
          newSettings.displayLocale,
          newSettings.inlineAnnotationsMaxLength
        );
        completionProviderInst?.updateDisplayLocale(newSettings.displayLocale);
        await detectAndIndex();
        updateAllProviders();
      }
    },
    null,
    context.subscriptions
  );

  for (const document of vscode.workspace.textDocuments) {
    if (document.languageId === "dart") {
      const diagnostics = dartDiagnostics?.validateDocument(document);
      if (diagnostics) {
        dartDiagnostics.updateDiagnostics(document, diagnostics);
      }
    }
    if (document.fileName.endsWith(".arb")) {
      const diagnostics = arbDiagnostics?.validateArbFile(
        document,
        document.getText()
      );
      if (diagnostics) {
        arbDiagnostics.updateDiagnostics(document, diagnostics);
      }
    }
  }
}

export function deactivate(): void {
  inlineProvider?.dispose();
  arbDiagnostics?.dispose();
  dartDiagnostics?.dispose();
  fileWatcher?.dispose();
  refreshCoordinator?.dispose();
}
