# Fix package-lock.json

The lockfile is out of sync with package.json. To fix:

```bash
cd backend
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "fix: regenerate package-lock.json for expo-server-sdk"
```

After this, change the Dockerfile back to just `RUN npm ci --only=production`.
