import * as vscode from 'vscode';
import { LanguageClient, RequestType } from 'vscode-languageclient';

export interface ClientViewNode {
    /** This is the model name of the resource. */
    modelName: string;

    /** This is the fiterType.*/
    filterType: string;

    /** This is the human readable name of a resource, such as "objPlayer". */
    name: string;

    /** This is the UUID of the resource. */
    id: string;

    /** This is the absolute filepath to either the .GML file, if it exists, or the .YY file, if it exist,
     * or the view folder YY file. */
    fpath: string;
}

export class ResourceTree implements vscode.TreeDataProvider<ClientViewNode> {
    private _client: LanguageClient;
    private _onDidChangeTreeData: vscode.EventEmitter<ClientViewNode | undefined>;

    constructor(client: LanguageClient) {
        this._client = client;
        this._onDidChangeTreeData = new vscode.EventEmitter();
    }

    get onDidChangeTreeData(): vscode.Event<ClientViewNode | undefined> {
        return this._onDidChangeTreeData.event;
    }

    getTreeItem(node: ClientViewNode): vscode.TreeItem {
        const item = new vscode.TreeItem(node.name);
        item.id = node.id;
        item.resourceUri = vscode.Uri.file(node.fpath);

        item.contextValue = node.filterType + (node.modelName === 'GMFolder' ? ':Folder' : ':File');
        item.iconPath = node.modelName === 'GMFolder' ? vscode.ThemeIcon.Folder : vscode.ThemeIcon.File;
        item.collapsibleState = this.isPseudoFolder(node.modelName)
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None;

        if (!this.isPseudoFolder(node.modelName)) {
            item.command = {
                command: 'GMLTools.openFile',
                title: '',
                arguments: [node]
            };
        }

        return item;
    }

    async getChildren(node?: ClientViewNode): Promise<ClientViewNode[]> {
        if (node === undefined) {
            const initViews = await this._client.sendRequest(
                new RequestType<string, ClientViewNode[], void, void>('getViewsAtUUID'),
                'init'
            );

            return initViews;
        }

        const resourceViews = await this._client.sendRequest(
            new RequestType<string, ClientViewNode[], void, void>('getViewsAtUUID'),
            node.id
        );

        return resourceViews;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    private isPseudoFolder(modelName: string): boolean {
        return ['GMFolder', 'GMObject', 'GMShader', 'GMSprite'].includes(modelName);
    }
}

export class ResourceTreeView {
    resourceTree: vscode.TreeView<ClientViewNode>;
    resourceTreeDataProvider: ResourceTree;

    constructor(client: LanguageClient) {
        this.resourceTreeDataProvider = new ResourceTree(client);
        this.resourceTree = vscode.window.createTreeView('GMLTools.resourceTree', {
            treeDataProvider: this.resourceTreeDataProvider
        });
    }

    reveal(thisView: ClientViewNode) {
        this.resourceTree.reveal(thisView, {
            focus: true,
            select: true
        });
    }
}
