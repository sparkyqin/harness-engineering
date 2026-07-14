# Playwright Recipes — E2E 常用模式

> test-e2e Skill 的按需参考资料。不全量加载，写 E2E 时查阅。

## 登录态准备

```javascript
// 复用登录态：storageState
test.use({ storageState: 'e2e/.auth/john.json' });

// 或在测试内登录
async function login(page, email, password) {
  await page.goto('/login');
  await page.fill('[name=email]', email);
  await page.fill('[name=password]', password);
  await page.click('button[type=submit]');
  await page.waitForURL(/dashboard|home/);
}
```

## 换号登录（本 harness 示例场景）

```javascript
test('S-023 换号登录保留英文', async ({ page, context }) => {
  // GIVEN john 切英文并登出
  await login(page, 'john@x.com', 'pass');
  await page.click('[data-testid=lang-switch-en]');
  await expect(page.locator('header')).toContainText('Products'); // 英文
  await page.click('[data-testid=logout]');

  // WHEN jane 登录
  await login(page, 'jane@x.com', 'pass');

  // THEN Header 保持英文
  await expect(page.locator('header')).toContainText('Products');
});
```

## 断言模式

```javascript
// 可见性
await expect(page.locator('.error')).toBeVisible();
// 文本
await expect(page.locator('h1')).toHaveText(/订单号/);
// URL
await expect(page).toHaveURL(/\/orders\/\d+/);
// 阻断下单
await expect(page.locator('[data-testid=order-blocked]')).toBeVisible();
```

## 换号/会话清理

```javascript
// 清 storage 模拟"登出"
await context.clearCookies();
await page.evaluate(() => localStorage.clear());
```

## 证据收集（防伪造）

```javascript
// 失败时截图 + trace，供 check-e2e-evidence.py 校验
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await page.screenshot({ path: `e2e-report/${testInfo.title}.png` });
  }
});
```

跑完 `npx playwright test` 会在 `playwright-report/` 产 HTML 报告，check-e2e-evidence.py 据此校验。
