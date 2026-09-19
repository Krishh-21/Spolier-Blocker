'use strict';
for (const button of document.querySelectorAll('[data-style]')) button.addEventListener('click', () => {
  document.getElementById('demoContent').className = 'demo-content ' + button.dataset.style;
  for (const item of document.querySelectorAll('[data-style]')) item.setAttribute('aria-pressed', String(item === button));
});
document.getElementById('demoPreview').addEventListener('click', () => document.getElementById('demoDialog').showModal());
document.getElementById('closeDemo').addEventListener('click', () => document.getElementById('demoDialog').close());
fetch('/api/policy').then(response => { if (!response.ok) throw Error(); return response.json(); }).then(({ limits }) => {
  for (const item of document.querySelectorAll('[data-limit]')) item.textContent = limits[item.dataset.limit] === null ? 'Unlimited' : limits[item.dataset.limit];
}).catch(() => { document.getElementById('policyStatus').textContent = 'Showing default limits; the plan service is currently unavailable.'; });
