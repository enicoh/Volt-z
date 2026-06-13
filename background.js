/**
 * Background Service Worker for Antigravity Trading Edge
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log("Antigravity Trading Edge Extension Installed Successfully.");
  // Initialize default storage values if not set
  chrome.storage.local.get(['selectedPair', 'autoSelect', 'strategies'], (result) => {
    const updates = {};
    if (!result.selectedPair) updates.selectedPair = 'BTCUSD';
    if (result.autoSelect === undefined) updates.autoSelect = true;
    if (!result.strategies) {
      updates.strategies = {
        accumulationDistribution: true,
        supplyDemand: true,
        supportResistance: true,
        fibonacci: true,
        priceAction: true,
        marketStructure: true,
        volumeProfile: true
      };
    }
    
    if (Object.keys(updates).length > 0) {
      chrome.storage.local.set(updates);
    }
  });
});

// Listener for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'log') {
    console.log(`[Content Script]: ${message.text}`);
    sendResponse({ status: 'ok' });
  } else if (message.action === 'clearHUD') {
    chrome.storage.local.set({ runHUD: false });
    sendResponse({ status: 'cleared' });
  }
  return true; // Keep message channel open for async response
});
