
function _get_window() {
    let workspaceManager = global.workspace_manager;
    let nWorkspaces = workspaceManager.get_n_workspaces();
    
    for (let i = 0; i < nWorkspaces; ++i) {
        let workspace = workspaceManager.get_workspace_by_index(i);
        let windows = workspace.list_windows()
        for (let window of windows) {
            // 10/10 accuracy
            if (window.title == "Spotify") {
                return window;
            }
        }
    }

    return undefined
}

function activate() {
    let spotify_window = _get_window();
    if (spotify_window) {
        spotify_window.activate(global.get_current_time());
    }
}

function close() {
    let spotify_window = _get_window();
    if (spotify_window) {
        spotify_window.kill();
    }
}