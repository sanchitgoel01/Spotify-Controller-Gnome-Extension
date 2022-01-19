extension_name=spotify-controller@sanchitgoel01

schema:
	glib-compile-schemas ${extension_name}/schemas/

install: schema
	cp -R ${extension_name} ~/.local/share/gnome-shell/extensions/

preferences:
	gnome-extensions prefs ${extension_name}

debug:
	journalctl /usr/bin/gnome-shell -f -o cat