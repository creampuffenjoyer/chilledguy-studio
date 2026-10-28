# Chilled Guy Studio

Static browser app with browser-local demo accounts and a meme prank experience.
Accounts stay in localStorage and are not shared between browsers or devices.
The prank plays audio, opens popup windows, and downloads an image.

## Development

Requires Node.js 18 or newer. No dependencies need installing.

```sh
npm run build
npm run dev
```

Open http://localhost:5173. Run the build again after editing source files.

## Hosting

The GitHub Pages workflow builds and deploys `dist/` on pushes to `main`.
In the GitHub repository, select **Settings → Pages → Source → GitHub Actions**.
Then push the project to https://github.com/creampuffenjoyer/chilledguy-studio.
After successful deployment, the expected public URL is:
https://creampuffenjoyer.github.io/chilledguy-studio/

The separate, unpublished Sites development project is recorded in
`.openai/hosting.json`.
