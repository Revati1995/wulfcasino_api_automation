import { request } from '@playwright/test';

async function testEndpoint() {
  const context = await request.newContext({
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  try {
    console.log('Testing POST https://api-staging.wulfcasino.com/api/v1/admin/auth/login');
    const response = await context.post('https://api-staging.wulfcasino.com/api/v1/admin/auth/login', {
      data: {
        email: 'admin@wulfcasino.com',
        password: 'superadmin',
      },
    });

    console.log('Status:', response.status());
    console.log('Status Text:', response.statusText());
    const body = await response.json();
    console.log('Body:', JSON.stringify(body, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await context.dispose();
  }
}

testEndpoint();
