import { App, Plugin, PluginSettingTab, Setting, WorkspaceSidedock, ButtonComponent } from 'obsidian';

interface AutoHideSettings {
	expandSidebar_onClickRibbon: boolean;
	expandSidebar_onClickNoteTitle: boolean;
	lockSidebar: boolean;
	leftPinActive: boolean;
	rightPinActive: boolean;
}

const DEFAULT_SETTINGS: AutoHideSettings = {
	expandSidebar_onClickRibbon: false,
	expandSidebar_onClickNoteTitle: false,
	lockSidebar: false,
	leftPinActive: false,
	rightPinActive: false
}

export default class AutoHidePlugin extends Plugin {
	settings: AutoHideSettings;
	leftSplit: WorkspaceSidedock;
	rightSplit: WorkspaceSidedock;
	rootSplitEl: HTMLElement;
	leftRibbonEl: HTMLElement;
	rightRibbonEl: HTMLElement;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new AutoHideSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => {
			this.init();
			this.registerEvents();
			this.togglePins();
		})
		// Reassigned when workspace is switched
		this.app.workspace.on("layout-change", () => {
			this.init();
		});
	}

	onunload() {
		this.removePins();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	init() {
		this.leftSplit = this.app.workspace.leftSplit;
		this.rightSplit = this.app.workspace.rightSplit;
		this.rootSplitEl = (this.app.workspace.rootSplit as any).containerEl;
		this.leftRibbonEl = (this.app.workspace.leftRibbon as any).containerEl;
		this.rightRibbonEl = (this.app.workspace.rightRibbon as any).containerEl;
	}

	registerEvents() {
		// Use workspace.containerEl instead of rootSplitEl to avoid removing EventListener when switching workspace
		this.registerDomEvent(this.app.workspace.containerEl, 'click', (evt: any) => {
			// focus to rootSplitEl
			if (!evt.path.contains(this.rootSplitEl)) {
				return;
			}
			// prevents unexpected behavior when clicking on the expand button
			if (evt.path.some((element: HTMLElement) => element.className === "workspace-tab-header-container")) {
				return;
			}
			// prevents unexpected behavior when clicking on the tag
			if (evt.target.classList.contains("cm-hashtag") || evt.target.classList.contains("tag")) {
				return;
			}

			// Click on the note title to expand the left sidebar (Optional).
			if (evt.target.classList.contains("view-header-title") && this.settings.expandSidebar_onClickNoteTitle) {
				if (this.leftSplit.collapsed == true) this.leftSplit.expand();
				return;
			}


			// // Click on the rootSplit() to collapse both sidebars.
			if (!this.settings.leftPinActive) {
				this.leftSplit.collapse();
			}
			if (!this.settings.rightPinActive) {
				this.rightSplit.collapse();
			}

		});

		// Click on the blank area of leftRibbonEl to expand the left sidebar (Optional).
		this.registerDomEvent(this.leftRibbonEl, 'click', (evt: MouseEvent) => {
			if (this.settings.expandSidebar_onClickRibbon) {
				if (evt.target == this.leftRibbonEl) {
					if (this.leftSplit.collapsed == true) this.leftSplit.expand();
				}
			}
		});

		// Click on the blank area of rightRibbonEl to expand the right sidebar (Optional).
		this.registerDomEvent(this.rightRibbonEl, 'click', (evt: MouseEvent) => {
			if (this.settings.expandSidebar_onClickRibbon) {
				if (evt.target == this.rightRibbonEl) {
					if (this.rightSplit.collapsed == true) this.rightSplit.expand();
				}
			}
		});
	}

	// Feature: pane locking

	togglePins() {
		if (this.settings.lockSidebar) {
			this.addPins();
		} else {
			this.removePins();
		}
	}

	addPins() {
		// tabHeaderContainers[0]=left, [2]=right. need more robust way to get these
		const tabHeaderContainers = document.getElementsByClassName("workspace-tab-header-container");

		const lb = new ButtonComponent(tabHeaderContainers[0] as HTMLElement)
			.setIcon("pin")
			.setClass("auto-hide-button")
			.onClick(async () => {
				document.getElementsByClassName("auto-hide-button")[0].classList.toggle("is-active");
				this.settings.leftPinActive = !this.settings.leftPinActive;
				await this.saveSettings();

				if (this.settings.leftPinActive) {
					lb.setIcon("filled-pin");
				} else {
					lb.setIcon("pin");
				}
			});

		const rb = new ButtonComponent(tabHeaderContainers[2] as HTMLElement)
			.setIcon("pin")
			.setClass("auto-hide-button")
			.onClick(async () => {
				document.getElementsByClassName("auto-hide-button")[1].classList.toggle("is-active");
				this.settings.rightPinActive = !this.settings.rightPinActive;
				await this.saveSettings();

				if (this.settings.rightPinActive) {
					rb.setIcon("filled-pin");
				} else {
					rb.setIcon("pin");
				}
			});
	}

	removePins() {
		const pins = document.getElementsByClassName("auto-hide-button");
		while (pins.length) {
			if (pins.item(0) != null) {
				pins[0].remove();
			}
		}
	}
}

class AutoHideSettingTab extends PluginSettingTab {
	plugin: AutoHidePlugin;

	constructor(app: App, plugin: AutoHidePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Settings for Auto Hide plugin.' });

		new Setting(containerEl)
			.setName('Expand the sidebar with a ribbon')
			.setDesc('Click on the blank area of ribbon to expand the sidebar.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.expandSidebar_onClickRibbon)
				.onChange(async (value) => {
					this.plugin.settings.expandSidebar_onClickRibbon = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Expand the sidebar with a note title')
			.setDesc('Click on the note title to expand the left sidebar.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.expandSidebar_onClickNoteTitle)
				.onChange(async (value) => {
					this.plugin.settings.expandSidebar_onClickNoteTitle = value;
					await this.plugin.saveSettings();
				}));
		containerEl.createEl('h4', { text: 'EXPERIMENTAL!' });
		new Setting(containerEl)
			.setName('Lock sidebar collapse')
			.setDesc('Add a pin that can temporarily lock the sidebar collapse.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.lockSidebar)
				.onChange(async (value) => {
					this.plugin.settings.lockSidebar = value;
					await this.plugin.saveSettings();
					this.plugin.togglePins();
				}));
	}
}
