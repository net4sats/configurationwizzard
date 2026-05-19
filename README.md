# configurationwizzard

`configurationwizzard` is the net4sats router admin interface for OpenWrt devices.

## What lives here

- `src/` contains the admin dashboard used by the router operator.
- `openwrt/` contains the rpcd and uhttpd integration for deploying that admin app to the router.
- `mockup/` contains static design references and prototype flows. These are intentionally published as static artifacts on GitHub Pages and are not bundled into the admin SPA.

## GitHub Pages

GitHub Pages publishes two things from this repository:

- the mock-mode admin demo at `/configurationwizzard/`
- the static mockups at `/configurationwizzard/mockups/`

Run the same build locally with:

```sh
npm run build:pages
```

## Router deployment

The production router build still targets `/net4sats/` and can be deployed with:

```sh
./deploy.sh
```
