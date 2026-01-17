/**
 * TRX Staking Yield Analysis
 * Complete JavaScript functionality for the TRX yield calculator
 */

let currentTRXPrice = null;
const walletAddress = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';

// Super Representative Data
let srDataCache = [];

// Fetch TRX price on load
async function getTRXPrice() {
    try {
        const response = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd"
        );
        const data = await response.json();
        currentTRXPrice = data.tron.usd;
        document.getElementById("currentPrice").textContent = "$" + currentTRXPrice.toFixed(4);
        updateAdditionalInvestmentState();
        // Update connection status to show successful price fetch
        updatePriceConnectionStatus(true);
    } catch (err) {
        document.getElementById("currentPrice").textContent = "-- USD";
        console.error("Error loading TRX price:", err);
        updateAdditionalInvestmentState();
        // Update connection status to show manual entry instruction
        updatePriceConnectionStatus(false);
    }
}

// Fetch TRON network statistics using the same approach as test2.html
async function getTRONNetworkStats() {
    try {
        const response = await fetch('https://api.trongrid.io/wallet/getaccountresource', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                address: walletAddress,
                visible: true
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('TRON Network Data:', data); // Debug log
        
        // Update network statistics with formatted numbers
        document.getElementById('totalNetWeight').textContent = formatNetworkNumber(data.TotalNetWeight || 0);
        document.getElementById('totalEnergyWeight').textContent = formatNetworkNumber(data.TotalEnergyWeight || 0);
        document.getElementById('totalNetLimit').textContent = formatNetworkNumber(data.TotalNetLimit || 0);
        document.getElementById('totalEnergyLimit').textContent = formatNetworkNumber(data.TotalEnergyLimit || 0);
        
        // Calculate and display Energy/stakedTRX and Bandwidth/stakedTRX
        const energyPerStaked = (data.TotalEnergyLimit && data.TotalEnergyWeight) ?
            (data.TotalEnergyLimit / data.TotalEnergyWeight) : 0;
        const bandwidthPerStaked = (data.TotalNetLimit && data.TotalNetWeight) ?
            (data.TotalNetLimit / data.TotalNetWeight) : 0;
        
        document.getElementById('energyPerStakedTRX').textContent = formatNetworkNumber(energyPerStaked);
        document.getElementById('bandwidthPerStakedTRX').textContent = formatNetworkNumber(bandwidthPerStaked);
        
        // Update energy and bandwidth availability after network data is loaded
        updateEnergyBandwidthDisplay();
        
        // Enable address input since we have internet connectivity
        updateAddressInputStatus(true);
        
    } catch (err) {
        console.error('Error loading TRON network stats:', err);
        document.getElementById('totalNetWeight').textContent = '--';
        document.getElementById('totalEnergyWeight').textContent = '--';
        document.getElementById('totalNetLimit').textContent = '--';
        document.getElementById('totalEnergyLimit').textContent = '--';
        document.getElementById('energyPerStakedTRX').textContent = '--';
        document.getElementById('bandwidthPerStakedTRX').textContent = '--';
        
        // Disable address input since we don't have internet connectivity
        updateAddressInputStatus(false);
    }
}

function updateAddressInputStatus(isOnline) {
    const statusElement = document.getElementById('connectionStatus');
    const addressInput = document.getElementById('trxAddress');
    const fetchButton = document.getElementById('fetchDataBtn');
    const addressSection = document.getElementById('addressInputSection');
    
    if (isOnline) {
        // Check if TRX price is available
        if (currentTRXPrice !== null && currentTRXPrice > 0) {
            statusElement.textContent = 'Online - Address input enabled';
        } else {
            statusElement.textContent = 'Online - Address input enabled, TRX price: click price box to enter manually';
        }
        statusElement.className = 'connection-status online';
        addressInput.disabled = false;
        fetchButton.disabled = false;
        addressSection.classList.remove('offline');
    } else {
        if (currentTRXPrice !== null && currentTRXPrice > 0) {
            statusElement.textContent = 'Offline - Click TRX price box to enter manually if needed';
        } else {
            statusElement.textContent = 'Offline - Click TRX price box to enter manually';
        }
        statusElement.className = 'connection-status offline';
        addressInput.disabled = true;
        fetchButton.disabled = true;
        addressSection.classList.add('offline');
    }
}

function updatePriceConnectionStatus(priceOnline) {
    // This function is deprecated - status is now handled by updateAddressInputStatus
    // Keep for compatibility but delegate to main status function
    // The connection status is now unified and based on API availability
    console.log('Price connection status update:', priceOnline ? 'online' : 'offline');
}

function formatNetworkNumber(num) {
    if (num >= 1000000000000) {
        return (num / 1000000000000).toFixed(2) + 'T';
    } else if (num >= 1000000000) {
        return (num / 1000000000).toFixed(2) + 'B';
    } else if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
    }
    return num.toLocaleString();
}

function enableManualPrice() {
    document.getElementById('currentPrice').style.display = 'none';
    document.getElementById('manualPriceInput').style.display = 'flex';
    document.getElementById('manualPrice').focus();
}

function updateManualPrice() {
    const manualPrice = parseFloat(document.getElementById('manualPrice').value) || 0;
    // Update display if valid price entered
    if (manualPrice > 0) {
        currentTRXPrice = manualPrice;
        updateAdditionalInvestmentState();
    }
}

function confirmManualPrice() {
    const manualPrice = parseFloat(document.getElementById('manualPrice').value) || 0;
    if (manualPrice > 0) {
        currentTRXPrice = manualPrice;
        document.getElementById('currentPrice').textContent = '$' + manualPrice.toFixed(4);
        document.getElementById('currentPrice').style.display = 'block';
        document.getElementById('manualPriceInput').style.display = 'none';
        updateAdditionalInvestmentState();
    } else {
        customAlert('Please enter a valid price');
    }
}

function handleManualPriceEnter(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        confirmManualPrice();
    }
}

function analyzeStakingData(accountData, resourceData, detailedAccountData) {
    const analysis = {
        totalTRXBalance: 0,
        totalStaked: 0,
        energyStaking: {
            amount: 0,
            source: 'Not found'
        },
        bandwidthStaking: {
            amount: 0,
            source: 'Not found'
        },
        votingStaking: {
            amount: 0,
            votes: 0
        },
        availableEnergy: 0,
        availableBandwidth: 0,
        delegatedResources: {
            energyIn: 0,
            energyOut: 0,
            bandwidthIn: 0,
            bandwidthOut: 0
        }
    };

    console.log('Basic Account Data:', accountData);
    console.log('Resource Data:', resourceData);

    // Extract TRX balance
    if (accountData.balance) {
        analysis.totalTRXBalance = accountData.balance / 1000000; // Convert from SUN to TRX
    }

    // Extract voting information (frozen for voting)
    if (accountData.votes && accountData.votes.length > 0) {
        analysis.votingStaking.votes = accountData.votes.reduce((sum, vote) => sum + (vote.vote_count || 0), 0);
        analysis.votingStaking.amount = analysis.votingStaking.votes; // In TRON, 1 vote = 1 TRX frozen
    }

    // Extract energy staking from account_resource
    if (accountData.account_resource && accountData.account_resource.frozen_balance_for_energy) {
        analysis.energyStaking.amount = accountData.account_resource.frozen_balance_for_energy.frozen_balance / 1000000;
        analysis.energyStaking.source = 'account_resource.frozen_balance_for_energy';
    }

    // Extract bandwidth staking from frozen array
    if (accountData.frozen && accountData.frozen.length > 0) {
        const bandwidthFrozen = accountData.frozen.find(f => f.frozen_balance);
        if (bandwidthFrozen) {
            analysis.bandwidthStaking.amount = bandwidthFrozen.frozen_balance / 1000000;
            analysis.bandwidthStaking.source = 'frozen[0].frozen_balance';
        }
    }

    // Extract current available resources (these are the energy/bandwidth UNITS you see on TronScan)
    if (resourceData.EnergyLimit) {
        analysis.availableEnergy = resourceData.EnergyLimit;
    }
    if (resourceData.NetLimit) {
        analysis.availableBandwidth = resourceData.NetLimit;
    }

    // Extract delegated resources (TRX amounts delegated TO you)
    if (resourceData.delegated_frozenV2_balance_for_energy) {
        analysis.delegatedResources.energyIn = resourceData.delegated_frozenV2_balance_for_energy / 1000000;
    }
    if (resourceData.acquire_delegated_frozenV2_balance_for_energy) {
        analysis.delegatedResources.energyOut = resourceData.acquire_delegated_frozenV2_balance_for_energy / 1000000;
    }

    // Calculate total staked (only your own staking, not delegated)
    analysis.totalStaked = analysis.energyStaking.amount + analysis.bandwidthStaking.amount + analysis.votingStaking.amount;

    console.log('Final Analysis:', analysis);

    return analysis;
}

async function fetchTRXData() {
    const address = document.getElementById('trxAddress').value.trim();
    
    if (!address) {
        customAlert('Please enter a TRX address');
        return;
    }
    
    if (!address.startsWith('T') || address.length !== 34) {
        customAlert('Please enter a valid TRX address (should start with T and be 34 characters long)');
        return;
    }
    
    // Show loading state
    const fetchButton = document.getElementById('fetchDataBtn');
    const originalText = fetchButton.textContent;
    fetchButton.textContent = 'Fetching...';
    fetchButton.disabled = true;
    
    try {
        // Fetch account data - using single detailed account endpoint to avoid rate limiting
        const [detailedAccount, accountResources, accountTransactions] = await Promise.all([
            // Detailed account information including frozen balances (contains most basic account info too)
            fetch(`https://api.trongrid.io/v1/accounts/${address}`),
            
            // Account resources (energy, bandwidth, etc.)
            fetch('https://api.trongrid.io/wallet/getaccountresource', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    address: address,
                    visible: true
                })
            }),
            
            // Recent transactions
            fetch(`https://api.trongrid.io/v1/accounts/${address}/transactions?limit=10`)
        ]);
        
        // Parse responses
        const detailedAccountData = await detailedAccount.json();
        const resourceData = await accountResources.json();
        const transactionData = await accountTransactions.json();
        
        // Extract account data from detailed response
        const accountData = detailedAccountData && detailedAccountData.data && detailedAccountData.data.length > 0
            ? detailedAccountData.data[0]
            : {};
        
        // Extract both delegated and self-staked resource values
        let delegatedEnergyTRX = 0;
        let delegatedBandwidthTRX = 0;
        let selfStakedEnergyTRX = 0;
        let selfStakedBandwidthTRX = 0;
        
        // Extract delegated resources (TRX delegated TO this address)
        if (detailedAccountData && detailedAccountData.data && detailedAccountData.data.length > 0) {
            const accountResource = detailedAccountData.data[0].account_resource || {};
            
            // Extract delegated energy (convert from SUN to TRX)
            if (accountResource.delegated_frozenV2_balance_for_energy) {
                delegatedEnergyTRX = accountResource.delegated_frozenV2_balance_for_energy / 1000000;
            }
            
            // Extract delegated bandwidth (convert from SUN to TRX)
            if (detailedAccountData.data[0].delegated_frozenV2_balance_for_bandwidth) {
                delegatedBandwidthTRX = detailedAccountData.data[0].delegated_frozenV2_balance_for_bandwidth / 1000000;
            }
        }
        
        // Extract delegated energy from accountInfo.account_resource (primary location)
        if (accountData.account_resource && accountData.account_resource.delegated_frozenV2_balance_for_energy) {
            delegatedEnergyTRX = accountData.account_resource.delegated_frozenV2_balance_for_energy / 1000000;
        }
        
        // Extract self-staked resources from frozenV2 array
        console.log('Checking frozenV2 array:', accountData.frozenV2);
        if (accountData.frozenV2 && accountData.frozenV2.length > 0) {
            accountData.frozenV2.forEach((frozen, index) => {
                console.log(`frozenV2[${index}]:`, frozen);
                if (frozen.type === "ENERGY" && frozen.amount) {
                    // Self-staked energy: {"type": "ENERGY", "amount": 22000000}
                    selfStakedEnergyTRX = frozen.amount / 1000000;
                    console.log('Found self-staked energy:', selfStakedEnergyTRX);
                } else if ((!frozen.type || frozen.type === undefined) && frozen.amount) {
                    // Self-staked bandwidth: {"amount": 174341625}
                    selfStakedBandwidthTRX = frozen.amount / 1000000;
                    console.log('Found self-staked bandwidth:', selfStakedBandwidthTRX);
                }
            });
        }
        
        // Calculate totals
        const totalEnergyTRX = delegatedEnergyTRX + selfStakedEnergyTRX;
        const totalBandwidthTRX = delegatedBandwidthTRX + selfStakedBandwidthTRX;
        const totalTRX = totalEnergyTRX + totalBandwidthTRX;
        
        console.log('Complete staking breakdown:', {
            delegated: { energy: delegatedEnergyTRX, bandwidth: delegatedBandwidthTRX },
            selfStaked: { energy: selfStakedEnergyTRX, bandwidth: selfStakedBandwidthTRX },
            totals: { energy: totalEnergyTRX, bandwidth: totalBandwidthTRX, grand: totalTRX }
        });
        
        // Auto-populate the form fields
        if (totalTRX > 0) {
            // Set total TRX amount
            document.getElementById('trxAmount').value = totalTRX.toFixed(6);
            
            // Switch to values mode for staking split
            const stakingSplitCheckbox = document.getElementById('stakingSplitMode');
            if (!stakingSplitCheckbox.checked) {
                stakingSplitCheckbox.checked = true;
                toggleStakingMode(); // This will show the values mode
            }
            
            // Populate individual energy and bandwidth amounts
            document.getElementById('energyAmount').value = totalEnergyTRX.toFixed(6);
            document.getElementById('bandwidthAmount').value = totalBandwidthTRX.toFixed(6);
            
            // Calculate and set weighted average yield based on voting distribution
            calculateAndSetWeightedYield(accountData);
            
            // Trigger form updates
            updateStakingSplit();
            validateSplitValues();
            updateEnergyBandwidthDisplay();
        }
        
    } catch (error) {
        console.error('Error fetching TRX data:', error);
        alert('Error fetching data: ' + error.message + '\n\nPlease check your internet connection and try again.');
    } finally {
        // Restore button state
        fetchButton.textContent = originalText;
        fetchButton.disabled = false;
    }
}

function calculateAndSetWeightedYield(accountData) {
    console.log('calculateAndSetWeightedYield called with:', {
        hasVotes: !!(accountData.votes && accountData.votes.length > 0),
        votesCount: accountData.votes ? accountData.votes.length : 0,
        srDataCacheLength: srDataCache.length,
        accountData: accountData
    });
    
    // Check if we have SR data first
    if (srDataCache.length === 0) {
        console.log('SR data not available yet, skipping weighted yield calculation');
        updateSRStatus('SR data loading, yield calculation skipped', 'loading');
        return;
    }
    
    // Check if we have votes
    if (!accountData.votes || accountData.votes.length === 0) {
        console.log('No votes found in account data - account may not be voting');
        updateSRStatus('Account has no active votes', 'error');
        return;
    }
    
    let totalVotes = 0;
    let weightedYieldSum = 0;
    let matchedVotes = 0;
    let unmatchedAddresses = [];
    
    console.log(`Calculating weighted yield for ${accountData.votes.length} vote entries against ${srDataCache.length} SRs`);
    
    // Calculate weighted average yield
    accountData.votes.forEach(vote => {
        const voteCount = vote.vote_count || 0;
        const voteAddress = vote.vote_address;
        
        console.log(`Processing vote: ${voteAddress} with ${voteCount} votes`);
        
        if (voteCount > 0 && voteAddress) {
            // Find matching SR in cached data by address
            const matchingSR = srDataCache.find(sr => sr.address === voteAddress);
            
            if (matchingSR && matchingSR.annualizedRate !== undefined) {
                const srYield = parseFloat(matchingSR.annualizedRate) || 0;
                weightedYieldSum += (voteCount * srYield);
                totalVotes += voteCount;
                matchedVotes++;
                
                console.log(`✓ Matched vote: ${voteAddress.substring(0,8)}... (${voteCount} votes @ ${srYield}%)`);
            } else {
                console.log(`✗ No SR data found for vote address: ${voteAddress}`);
                unmatchedAddresses.push(voteAddress.substring(0,8) + '...');
            }
        }
    });
    
    // Calculate weighted average and update yield input
    if (totalVotes > 0 && matchedVotes > 0) {
        const weightedAverageYield = weightedYieldSum / totalVotes;
        
        // Update the yield input field
        const yieldInput = document.getElementById('stakingYield');
        if (yieldInput) {
            yieldInput.value = weightedAverageYield.toFixed(2);
            
            // Trigger validation
            validateNumberInput(yieldInput);
            
            // Update status to show calculation result
            let statusMessage = `Weighted avg: (${matchedVotes}/${accountData.votes.length} SRs matched)`;
            if (unmatchedAddresses.length > 0) {
                statusMessage += ` | Unmatched: ${unmatchedAddresses.join(', ')}`;
            }
            updateSRStatus(statusMessage, 'success');
            
            console.log(`✅ Weighted average yield: ${weightedAverageYield.toFixed(2)}% from ${totalVotes} total votes across ${matchedVotes} SRs`);
        }
    } else if (totalVotes > 0 && matchedVotes === 0) {
        console.log('Account has votes but no SRs matched in current SR data');
        updateSRStatus(`${accountData.votes.length} votes found, but no SRs matched current data`, 'error');
    } else {
        console.log('No valid yield data found for vote calculation');
        updateSRStatus('No valid vote data found for yield calculation', 'error');
    }
}

function openDataDisplayPage(data) {
    // Create HTML content for the new page using string concatenation
    const htmlContent = '<!DOCTYPE html>' +
        '<html lang="en">' +
        '<head>' +
        '<meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
        '<title>TRX Address Data - ' + data.address + '</title>' +
        '<style>' +
        '@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap");' +
        '* { margin: 0; padding: 0; box-sizing: border-box; }' +
        'body { font-family: "JetBrains Mono", monospace; background: #000000; color: #e9f0ff; padding: 20px; line-height: 1.6; }' +
        '.container { max-width: 1200px; margin: 0 auto; }' +
        'h1 { color: #569cd6; margin-bottom: 20px; font-size: 1.5rem; }' +
        '.address-info { background: rgba(10, 10, 10, 0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 15px; margin-bottom: 20px; }' +
        '.json-container { background: #0a0a0a; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 20px; overflow-x: auto; }' +
        'pre { white-space: pre-wrap; font-size: 0.85rem; color: #e9f0ff; }' +
        '.json-key { color: #569cd6; }' +
        '.json-string { color: #ce9178; }' +
        '.json-number { color: #b5cea8; }' +
        '.json-boolean { color: #569cd6; }' +
        '.json-null { color: #808080; }' +
        '.back-button { background: linear-gradient(180deg, rgba(86, 156, 214, 0.8), rgba(86, 156, 214, 0.6)); border: 1px solid rgba(86, 156, 214, 0.4); color: #e9f0ff; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-family: "JetBrains Mono", monospace; font-size: 0.85rem; margin-bottom: 20px; }' +
        '.back-button:hover { background: linear-gradient(180deg, rgba(86, 156, 214, 0.9), rgba(86, 156, 214, 0.7)); }' +
        '</style>' +
        '</head>' +
        '<body>' +
        '<div class="container">' +
        '<button class="back-button" onclick="window.close()">← Close Window</button>' +
        '<h1>TRX Address Data</h1>' +
        '<div class="address-info">' +
        '<strong>Address:</strong> ' + data.address + '<br>' +
        '<strong>Fetched At:</strong> ' + new Date(data.fetchedAt).toLocaleString() + '<br>' +
        '<strong>Data Structure:</strong> Account Info + Resources + Recent Transactions' +
        '</div>' +
        '<div class="json-container">' +
        '<pre>' + syntaxHighlightJSON(JSON.stringify(data, null, 2)) + '</pre>' +
        '</div>' +
        '</div>' +
        '</body>' +
        '</html>';
    
    // Open new window with the data
    const newWindow = window.open('', '_blank');
    newWindow.document.write(htmlContent);
    newWindow.document.close();
}

function syntaxHighlightJSON(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\\\u[a-zA-Z0-9]{4}|\\\\[^u]|[^\\\\"])*"(\\s*:)?|\\b(true|false|null)\\b|-?\\d+(?:\\.\\d*)?(?:[eE][+\\-]?\\d+)?)/g, function (match) {
        var cls = 'json-number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'json-key';
            } else {
                cls = 'json-string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
        } else if (/null/.test(match)) {
            cls = 'json-null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

function updateRestakeRatioDisplay() {
    const ratio = parseFloat(document.getElementById('restakeRatioSlider').value);
    // Match the current staking slider behavior exactly
    const energyPercent = 100 - ratio;
    const bandwidthPercent = ratio;
    
    document.getElementById('restakeEnergyRatio').textContent = energyPercent;
    document.getElementById('restakeBandwidthRatio').textContent = bandwidthPercent;
    
    // Update the split display elements to match current staking style
    document.getElementById('restakeEnergyPercent').textContent = energyPercent + '%';
    document.getElementById('restakeBandwidthPercent').textContent = bandwidthPercent + '%';
}

async function fetchSRData() {
    try {
        updateSRStatus('Fetching SR data...', 'loading');
        
        const response = await fetch('https://apilist.tronscanapi.com/api/pagewitness?witnesstype=0');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Raw API response:', data);
        
        // Check if data has the expected structure
        if (!data || !data.data || !Array.isArray(data.data)) {
            console.error('Unexpected API response structure:', data);
            throw new Error('Invalid API response structure');
        }
        
        console.log('Total SRs in response:', data.data.length);
        
        // Filter for active producers with yield data
        const activeSRs = data.data.filter(sr => {
            const hasProducer = sr.producer === true;
            const hasYield = sr.annualizedRate !== undefined && sr.annualizedRate !== null && sr.annualizedRate >= 0 && sr.annualizedRate <= 15;
            const hasName = sr.name || sr.url || sr.address;
            
            
            return hasProducer && hasYield && hasName;
        });
        
        
        // Sort by annualized rate descending
        activeSRs.sort((a, b) => b.annualizedRate - a.annualizedRate);
        
        // Cache the data
        srDataCache = activeSRs; // All active SRs
        
        // Populate the dropdown
        populateYieldDropdown();
        
        updateSRStatus(`Tronscan API Up, fetched ${srDataCache.length} SRs`, 'success');
        
        
    } catch (error) {
        console.error('Error fetching SR data:', error);
        updateSRStatus('Tronscan API down, using defaults', 'error');
        
        // Clear cache and fallback to default values
        srDataCache = [];
        populateYieldDropdownFallback();
    }
}

function populateYieldDropdown() {
    const dropdownList = document.getElementById('yieldDropdownList');
    
    if (!dropdownList) {
        console.error('Yield dropdown list element not found');
        return;
    }
    
    if (srDataCache.length === 0) {
        populateYieldDropdownFallback();
        return;
    }
    
    // Clear existing items
    dropdownList.innerHTML = '';
    
    
    // Add SR data items
    srDataCache.forEach((sr, index) => {
        const item = document.createElement('div');
        item.className = 'yield-dropdown-item';
        
        
        // Get display name with better fallback logic
        let srName = 'Unknown SR';
        if (sr.name && sr.name.trim() !== '') {
            srName = sr.name.trim();
        } else if (sr.url && sr.url.trim() !== '') {
            srName = sr.url.trim();
        } else if (sr.address && sr.address.trim() !== '') {
            srName = sr.address.substring(0, 8) + '...';
        }
        
        const displayName = srName.length > 15 ? srName.substring(0, 12) + '...' : srName;
        const yieldRate = (parseFloat(sr.annualizedRate) || 0).toFixed(1);
        
        item.textContent = `${displayName} - ${yieldRate}%`;
        item.addEventListener('click', () => selectSRValue(parseFloat(sr.annualizedRate) || 0, srName));
        
        dropdownList.appendChild(item);
    });
    
    // No default values - only show actual SR data
    
    // Initialize search functionality
    initializeYieldDropdownSearch();
    
    // Enable dropdown button when we have valid SR data
    const dropdownBtn = document.getElementById('yieldDropdownBtn');
    if (dropdownBtn) {
        dropdownBtn.style.opacity = '1';
        dropdownBtn.style.pointerEvents = 'auto';
        dropdownBtn.removeAttribute('title');
    }
}

function populateYieldDropdownFallback() {
    const dropdownList = document.getElementById('yieldDropdownList');
    const dropdownBtn = document.getElementById('yieldDropdownBtn');
    
    if (!dropdownList) {
        console.error('Yield dropdown list element not found');
        return;
    }
    
    // Disable dropdown when API is unavailable
    dropdownList.innerHTML = '<div class="yield-dropdown-item" style="pointer-events: none; color: var(--muted); text-align: center;">API unavailable - dropdown disabled</div>';
    
    // Disable dropdown button
    if (dropdownBtn) {
        dropdownBtn.style.opacity = '0.5';
        dropdownBtn.style.pointerEvents = 'none';
        dropdownBtn.title = 'Dropdown disabled - API unavailable';
    }
    
}

function selectSRValue(yieldValue, srName = null) {
    const input = document.getElementById('stakingYield');
    input.value = yieldValue.toFixed(1);
    
    // Close dropdown
    const dropdown = document.getElementById('yieldDropdown');
    dropdown.style.display = 'none';
    document.removeEventListener('click', closeYieldDropdownOutside);
    
    // Update status if it's an SR selection
    if (srName) {
        const truncatedName = srName.length > 20 ? srName.substring(0, 17) + '...' : srName;
        updateSRStatus(`Selected: ${truncatedName}`, 'success');
    }
    
    // Trigger validation
    validateNumberInput(input);
}

function updateSRStatus(message, type) {
    // Update the yield-specific status element
    const yieldStatusElement = document.getElementById('yieldConnectionStatus');
    
    if (yieldStatusElement) {
        if (type === 'loading') {
            yieldStatusElement.textContent = message;
            yieldStatusElement.className = 'connection-status';
        } else if (type === 'success') {
            yieldStatusElement.textContent = message;
            yieldStatusElement.className = 'connection-status online';
        } else if (type === 'error') {
            yieldStatusElement.textContent = message;
            yieldStatusElement.className = 'connection-status offline';
        }
    }
    
    // Also update the main connection status to show SR fetch status
    const mainStatusElement = document.getElementById('connectionStatus');
    
    if (mainStatusElement) {
        const currentStatus = mainStatusElement.textContent;
        
        if (type === 'success') {
            // Replace any existing SR status or append
            if (currentStatus.includes('|')) {
                const baseStatus = currentStatus.split('|')[0].trim();
                mainStatusElement.textContent = baseStatus + ' | SR data loaded';
            } else {
                mainStatusElement.textContent = currentStatus + ' | SR data loaded';
            }
        } else if (type === 'error') {
            // Replace any existing SR status or append
            if (currentStatus.includes('|')) {
                const baseStatus = currentStatus.split('|')[0].trim();
                mainStatusElement.textContent = baseStatus + ' | SR data failed';
            } else {
                mainStatusElement.textContent = currentStatus + ' | SR data failed';
            }
        }
    }
}

// Yield Dropdown Functions
function toggleYieldDropdown() {
    const dropdown = document.getElementById('yieldDropdown');
    const searchInput = document.getElementById('yieldSearchInput');
    const isVisible = dropdown.style.display === 'block';
    
    if (isVisible) {
        dropdown.style.display = 'none';
        document.removeEventListener('click', closeYieldDropdownOutside);
    } else {
        dropdown.style.display = 'block';
        // Clear and focus search input when opening
        if (searchInput) {
            searchInput.value = '';
            setTimeout(() => {
                searchInput.focus();
                filterYieldDropdown(); // Reset filter
            }, 10);
        }
        // Add outside click listener to close dropdown
        setTimeout(() => {
            document.addEventListener('click', closeYieldDropdownOutside);
        }, 10);
    }
}

function closeYieldDropdownOutside(event) {
    const dropdown = document.getElementById('yieldDropdown');
    const dropdownBtn = document.getElementById('yieldDropdownBtn');
    const searchInput = document.getElementById('yieldSearchInput');
    const wrapper = dropdown.parentElement;
    
    // Check if click is outside the dropdown wrapper
    if (!wrapper.contains(event.target)) {
        dropdown.style.display = 'none';
        document.removeEventListener('click', closeYieldDropdownOutside);
        
        // Clear search when closing
        if (searchInput) {
            searchInput.value = '';
        }
    }
}

function selectYieldValue(value) {
    const input = document.getElementById('stakingYield');
    input.value = value.toFixed(1);
    
    // Close dropdown
    const dropdown = document.getElementById('yieldDropdown');
    dropdown.style.display = 'none';
    document.removeEventListener('click', closeYieldDropdownOutside);
    
    // Clear search
    const searchInput = document.getElementById('yieldSearchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Trigger any validation or update functions if needed
    validateNumberInput(input);
}

// Initialize search functionality for yield dropdown
function initializeYieldDropdownSearch() {
    const searchInput = document.getElementById('yieldSearchInput');
    if (!searchInput) return;
    
    // Remove existing event listeners to prevent duplicates
    searchInput.removeEventListener('input', filterYieldDropdown);
    searchInput.removeEventListener('keydown', handleYieldSearchKeydown);
    
    // Add event listeners
    searchInput.addEventListener('input', filterYieldDropdown);
    searchInput.addEventListener('keydown', handleYieldSearchKeydown);
}

// Filter dropdown items based on search input
function filterYieldDropdown() {
    const searchInput = document.getElementById('yieldSearchInput');
    const dropdownList = document.getElementById('yieldDropdownList');
    
    if (!searchInput || !dropdownList) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const items = dropdownList.querySelectorAll('.yield-dropdown-item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        const matches = text.includes(searchTerm);
        
        if (matches) {
            item.classList.remove('hidden');
            // Highlight matching text
            highlightSearchText(item, searchTerm);
        } else {
            item.classList.add('hidden');
        }
    });
}

// Highlight search text in dropdown items
function highlightSearchText(item, searchTerm) {
    if (!searchTerm || searchTerm.length === 0) {
        // Reset text if no search term
        const originalText = item.textContent;
        item.innerHTML = originalText;
        return;
    }
    
    const originalText = item.textContent;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const highlightedText = originalText.replace(regex, '<span class="highlight">$1</span>');
    item.innerHTML = highlightedText;
}

// Handle keyboard navigation in search input
function handleYieldSearchKeydown(event) {
    const dropdown = document.getElementById('yieldDropdown');
    const searchInput = document.getElementById('yieldSearchInput');
    
    if (event.key === 'Escape') {
        // Close dropdown on Escape
        dropdown.style.display = 'none';
        document.removeEventListener('click', closeYieldDropdownOutside);
        searchInput.blur();
    } else if (event.key === 'Enter') {
        // Select first visible item on Enter
        event.preventDefault();
        const firstVisibleItem = document.querySelector('.yield-dropdown-item:not(.hidden)');
        if (firstVisibleItem && firstVisibleItem.style.pointerEvents !== 'none') {
            firstVisibleItem.click();
        }
    }
}

function updateAdditionalInvestment() {
    const amount = parseFloat(document.getElementById('investmentAmount').value) || 0;
    const frequency = parseInt(document.getElementById('investmentFrequency').value) || 0;
    // Additional validation can be added here
}

function updateAdditionalInvestmentState() {
    const hasTRXPrice = currentTRXPrice !== null && currentTRXPrice > 0;
    const additionalContent = document.querySelector('.additional-investment-content');
    const helpIcon = document.getElementById('additionalInvestmentHelp');
    
    if (hasTRXPrice) {
        if (additionalContent) {
            additionalContent.classList.remove('disabled');
        }
        helpIcon.classList.remove('visible');
        helpIcon.classList.add('hidden');
    } else {
        if (additionalContent) {
            additionalContent.classList.add('disabled');
        }
        helpIcon.classList.remove('hidden');
        helpIcon.classList.add('visible');
    }
}

function updateHelpIconsVisibility() {
    const trxAmount = parseFloat(document.getElementById('trxAmount').value) || 0;
    // Help icons are now part of the block titles and don't need separate visibility management
}

function getAdditionalInvestment(day = 0, growthParams = null, initialTRXPrice = 0) {
    const amount = parseFloat(document.getElementById('investmentAmount').value) || 0;
    const frequency = parseInt(document.getElementById('investmentFrequency').value) || 0;
    const hasTRXPrice = (initialTRXPrice || currentTRXPrice) > 0;
    
    if (!hasTRXPrice || amount <= 0 || frequency <= 0) {
        return { amountUSD: 0, amountTRX: 0, frequencyDays: 0 };
    }
    
    // Calculate TRX price for this specific day if growth is enabled
    let trxPriceToUse = initialTRXPrice || currentTRXPrice || 0;
    if (growthParams && growthParams.enabled && initialTRXPrice > 0) {
        trxPriceToUse = calculateTRXPriceAtDay(day, initialTRXPrice, growthParams);
    }
    
    return {
        amountUSD: amount,
        amountTRX: amount / trxPriceToUse,
        frequencyDays: frequency
    };
}

function toggleCustomDays() {
    const claimFrequency = document.getElementById('claimFrequency').value;
    const customDaysInput = document.getElementById('customDays');
    const wrapper = customDaysInput.parentElement;
    
    if (claimFrequency === 'custom') {
        customDaysInput.style.display = 'block';
        customDaysInput.value = '30'; // Default to 30 days
        wrapper.classList.remove('single-input');
    } else {
        customDaysInput.style.display = 'none';
        wrapper.classList.add('single-input');
    }
}

function getClaimFrequencyDays() {
    const claimFrequency = document.getElementById('claimFrequency').value;
    
    if (claimFrequency === 'custom') {
        return parseInt(document.getElementById('customDays').value) || 30;
    }
    
    return parseInt(claimFrequency);
}

function validateNumberInput(input) {
    // Remove any non-numeric characters except decimal point
    let value = input.value.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = value.split('.');
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    input.value = value;
}


function updateStakingSplit() {
    const trxAmount = parseFloat(document.getElementById('trxAmount').value) || 0;
    const stakingContents = document.querySelectorAll('.staking-content');
    
    if (trxAmount === 0) {
        stakingContents.forEach(content => content.classList.add('disabled'));
    } else {
        stakingContents.forEach(content => content.classList.remove('disabled'));
        // Update ratio display if in ratio mode
        if (!document.getElementById('stakingSplitMode').checked) {
            updateRatioDisplay();
        }
    }
    
    updateHelpIconsVisibility();
}

function toggleStakingMode() {
    const isValuesMode = document.getElementById('stakingSplitMode').checked;
    const ratioMode = document.getElementById('ratioMode');
    const valuesMode = document.getElementById('valuesMode');
    
    if (isValuesMode) {
        ratioMode.style.display = 'none';
        valuesMode.style.display = 'block';
        // Initialize values based on current ratio (reversed logic)
        const trxAmount = parseFloat(document.getElementById('trxAmount').value) || 0;
        const ratio = parseFloat(document.getElementById('ratioSlider').value) / 100;
        document.getElementById('energyAmount').value = (trxAmount * (1 - ratio)).toFixed(2);
        document.getElementById('bandwidthAmount').value = (trxAmount * ratio).toFixed(2);
    } else {
        ratioMode.style.display = 'block';
        valuesMode.style.display = 'none';
        updateRatioDisplay();
    }
}

function updateRatioDisplay() {
    const ratio = parseFloat(document.getElementById('ratioSlider').value);
    const trxAmount = parseFloat(document.getElementById('trxAmount').value) || 0;
    
    // Update percentage display (reverse the logic so left = more energy)
    const energyPercent = 100 - ratio;
    const bandwidthPercent = ratio;
    
    document.getElementById('energyRatio').textContent = energyPercent;
    document.getElementById('bandwidthRatio').textContent = bandwidthPercent;
    
    // Update TRX amounts
    const energyTrx = (trxAmount * energyPercent / 100).toFixed(2);
    const bandwidthTrx = (trxAmount * bandwidthPercent / 100).toFixed(2);
    
    document.getElementById('energyTrx').textContent = energyTrx;
    document.getElementById('bandwidthTrx').textContent = bandwidthTrx;
    
    // Update energy and bandwidth availability
    updateEnergyBandwidthDisplay();
}

function validateSplitValues() {
    const trxAmount = parseFloat(document.getElementById('trxAmount').value) || 0;
    const energyAmount = parseFloat(document.getElementById('energyAmount').value) || 0;
    const bandwidthAmount = parseFloat(document.getElementById('bandwidthAmount').value) || 0;
    const total = energyAmount + bandwidthAmount;
    
    const validationMessage = document.getElementById('splitValidation');
    
    if (Math.abs(total - trxAmount) > 0.01 && trxAmount > 0) {
        validationMessage.style.display = 'block';
        validationMessage.textContent = `Total (${total.toFixed(2)}) must equal current amount (${trxAmount.toFixed(2)})`;
        return false;
    } else {
        validationMessage.style.display = 'none';
        return true;
    }
}

function autoCalculateSplit(changedInput, type) {
    const trxAmount = parseFloat(document.getElementById('trxAmount').value) || 0;
    const changedValue = parseFloat(changedInput.value) || 0;
    
    if (trxAmount > 0) {
        const remaining = Math.max(0, trxAmount - changedValue);
        
        if (type === 'energy') {
            // User changed energy, auto-calculate bandwidth
            const bandwidthInput = document.getElementById('bandwidthAmount');
            bandwidthInput.value = remaining.toFixed(2);
        } else if (type === 'bandwidth') {
            // User changed bandwidth, auto-calculate energy
            const energyInput = document.getElementById('energyAmount');
            energyInput.value = remaining.toFixed(2);
        }
        
        // Validate after auto-calculation
        validateSplitValues();
        
        // Update energy/bandwidth display
        updateEnergyBandwidthDisplay();
    }
}

function toggleLendingMode() {
    const isLendingEnabled = document.getElementById('lendingMode').checked;
    const lendingInputsContainer = document.getElementById('lendingInputsContainer');
    
    console.log('Toggling lending mode:', isLendingEnabled);
    
    if (isLendingEnabled) {
        lendingInputsContainer.classList.remove('disabled');
    } else {
        lendingInputsContainer.classList.add('disabled');
    }
}

function toggleGrowthMode() {
    const isGrowthEnabled = document.getElementById('growthMode').checked;
    const growthInputsContainer = document.getElementById('growthInputsContainer');
    
    if (isGrowthEnabled) {
        growthInputsContainer.classList.remove('disabled');
    } else {
        growthInputsContainer.classList.add('disabled');
    }
}

function getGrowthParameters() {
    const isGrowthEnabled = document.getElementById('growthMode').checked;
    
    if (!isGrowthEnabled) {
        return { enabled: false, rate: 0, periodDays: 0 };
    }
    
    const growthRate = parseFloat(document.getElementById('growthRate').value) || 0;
    const growthPeriodDays = parseInt(document.getElementById('growthPeriod').value) || 0;
    
    return {
        enabled: true,
        rate: growthRate / 100, // Convert percentage to decimal
        periodDays: growthPeriodDays
    };
}

function calculateTRXPriceAtDay(day, initialPrice, growthParams) {
    if (!growthParams.enabled || growthParams.rate === 0 || growthParams.periodDays === 0) {
        return initialPrice;
    }
    
    // Calculate daily growth rate from the period rate
    // If rate is 5% annually (365 days), daily rate = (1.05)^(1/365) - 1
    const dailyGrowthRate = Math.pow(1 + growthParams.rate, 1 / growthParams.periodDays) - 1;
    
    // Apply smooth daily compound growth: Price = InitialPrice × (1 + dailyRate)^days
    return initialPrice * Math.pow(1 + dailyGrowthRate, day);
}

function getStakingSplit() {
    const isValuesMode = document.getElementById('stakingSplitMode').checked;
    const trxAmount = parseFloat(document.getElementById('trxAmount').value) || 0;
    
    if (trxAmount === 0) {
        return { energy: 0, bandwidth: 0 };
    }
    
    if (isValuesMode) {
        // Values mode - get manual inputs
        return {
            energy: parseFloat(document.getElementById('energyAmount').value) || 0,
            bandwidth: parseFloat(document.getElementById('bandwidthAmount').value) || 0
        };
    } else {
        // Ratio mode - calculate from slider (reversed so left = more energy)
        const ratio = parseFloat(document.getElementById('ratioSlider').value) / 100;
        return {
            energy: trxAmount * (1 - ratio),
            bandwidth: trxAmount * ratio
        };
    }
}

function getRestakeSplit() {
    // Get restake split ratios from the restake slider
    const ratio = parseFloat(document.getElementById('restakeRatioSlider').value) / 100;
    return {
        energyRatio: 1 - ratio,  // Left side = more energy (reversed like current staking)
        bandwidthRatio: ratio    // Right side = more bandwidth
    };
}

function calculateYield() {
    // Clear previous calculation globals
    window.finalEnergyStaked = undefined;
    window.finalBandwidthStaked = undefined;
    
    // Get input values, treating empty/invalid as 0
    const trxAmount = parseFloat(document.getElementById('trxAmount').value) || 0;
    const stakingYield = parseFloat(document.getElementById('stakingYield').value) || 0;
    const years = parseInt(document.getElementById('years').value) || 0;
    const months = parseInt(document.getElementById('months').value) || 0;
    
    // Get split configurations early in function scope
    const stakingSplit = getStakingSplit(); // Initial split for period 1 only
    const restakeSplit = getRestakeSplit(); // Split for all new TRX from rewards/lending
    
    // Get claim frequency early in function scope
    const claimDays = getClaimFrequencyDays();
    
    console.log('Basic inputs:', { trxAmount, stakingYield, years, months });
    
    // Validate TRX amount
    if (trxAmount <= 0) {
        customAlert('Please enter a valid TRX amount');
        return;
    }
    
    // Validate staking split if in values mode
    const isValuesMode = document.getElementById('stakingSplitMode').checked;
    if (isValuesMode && !validateSplitValues()) {
        customAlert('Energy and Bandwidth amounts must equal the total TRX amount');
        return;
    }
    
    // Get additional investment parameters
    const additionalInvestment = getAdditionalInvestment();
    
    // Get growth parameters and initial TRX price
    const growthParams = getGrowthParameters();
    const initialTRXPrice = currentTRXPrice || 0;
    
    console.log('Growth parameters:', growthParams);
    console.log('Initial TRX price:', initialTRXPrice);
    
    // Get lending parameters - MOVED TO TOP
    const lendingEnabled = document.getElementById('lendingMode').checked;
    
    // Get lending rates - frequencies use same as claimFrequency
    let energyLendingRate = parseFloat(document.getElementById('energyLendingRate').value) || 0;
    let bandwidthLendingRate = parseFloat(document.getElementById('bandwidthLendingRate').value) || 0;
    
    
    // Handle edge cases: if time is 0, show current amount only
    if (years === 0 && months === 0) {
        // Show warning popup for calculation without duration
        customAlert('⚠️ Calculate used without duration - showing current values only');
        
        let totalWithInvestments = trxAmount;
        if (additionalInvestment.frequencyDays > 0 && additionalInvestment.amountTRX > 0) {
            // Add all investments without compounding since no time
            totalWithInvestments += additionalInvestment.amountTRX;
        }
        updateResults(trxAmount, totalWithInvestments - trxAmount, totalWithInvestments, 0, totalWithInvestments, 0, 0, 0, 0, 0, 0);
        highlightImportantResults();
        return;
    }
    
    // Special case: if staking yield is 0 but we have time, still simulate lending income compounding
    if (stakingYield === 0) {
        let totalLendingIncome = 0;
        let totalEnergyIncome = 0;
        let totalBandwidthIncome = 0;
        const totalDays = years * 365 + months * 30;
        
        // Calculate lending income with proper reinvestment simulation even at 0% staking
        if (lendingEnabled && (energyLendingRate > 0 || bandwidthLendingRate > 0)) {
            // Get network parameters
            const energyPerStakedTRX = parseFormattedNumber(document.getElementById('energyPerStakedTRX').textContent);
            const bandwidthPerStakedTRX = parseFormattedNumber(document.getElementById('bandwidthPerStakedTRX').textContent);
            
            // Track energy and bandwidth amounts separately - start with initial split
            let currentEnergyStaked = stakingSplit.energy;
            let currentBandwidthStaked = stakingSplit.bandwidth;
            let stakingPrincipal = trxAmount;
            
            // Setup simulation variables
            let totalAdditionalInvestment = 0;
            let nextInvestmentDay = additionalInvestment.frequencyDays;
            let nextPayoutDay = claimDays;
            let accumulatedEnergyIncome = 0;
            let accumulatedBandwidthIncome = 0;
            
            // Daily simulation for lending income compounding
            for (let day = 1; day <= totalDays; day++) {
                // Calculate daily lending income based on current stakes
                const currentEnergyUnits = energyPerStakedTRX > 0 ? currentEnergyStaked * energyPerStakedTRX : 0;
                const currentBandwidthUnits = bandwidthPerStakedTRX > 0 ? currentBandwidthStaked * bandwidthPerStakedTRX : 0;
                
                const dailyEnergyIncome = (currentEnergyUnits * energyLendingRate) / 1000000;
                const dailyBandwidthIncome = (currentBandwidthUnits * bandwidthLendingRate) / 1000000;
                
                accumulatedEnergyIncome += dailyEnergyIncome;
                accumulatedBandwidthIncome += dailyBandwidthIncome;
                
                // Payout day - reinvest lending income using restake split
                if (day === nextPayoutDay) {
                    totalLendingIncome += accumulatedEnergyIncome + accumulatedBandwidthIncome;
                    totalEnergyIncome += accumulatedEnergyIncome;
                    totalBandwidthIncome += accumulatedBandwidthIncome;
                    
                    // Reinvest lending income using restake split ratios
                    const totalLendingPayout = accumulatedEnergyIncome + accumulatedBandwidthIncome;
                    const lendingEnergyReinvest = totalLendingPayout * restakeSplit.energyRatio;
                    const lendingBandwidthReinvest = totalLendingPayout * restakeSplit.bandwidthRatio;
                    
                    currentEnergyStaked += lendingEnergyReinvest;
                    currentBandwidthStaked += lendingBandwidthReinvest;
                    stakingPrincipal += totalLendingPayout;
                    
                    accumulatedEnergyIncome = 0;
                    accumulatedBandwidthIncome = 0;
                    nextPayoutDay += claimDays;
                }
                
                // Additional investment day - calculate using day-specific TRX price for growth
                if (additionalInvestment.frequencyDays > 0 && day === nextInvestmentDay &&
                    totalAdditionalInvestment < additionalInvestment.amountTRX * Math.floor(totalDays / additionalInvestment.frequencyDays)) {
                    
                    // Get additional investment with growth-adjusted price for this day
                    const dailyInvestment = getAdditionalInvestment(day, growthParams, initialTRXPrice);
                    const additionalEnergyStake = dailyInvestment.amountTRX * restakeSplit.energyRatio;
                    const additionalBandwidthStake = dailyInvestment.amountTRX * restakeSplit.bandwidthRatio;
                    
                    currentEnergyStaked += additionalEnergyStake;
                    currentBandwidthStaked += additionalBandwidthStake;
                    stakingPrincipal += dailyInvestment.amountTRX;
                    totalAdditionalInvestment += dailyInvestment.amountTRX;
                    nextInvestmentDay += additionalInvestment.frequencyDays;
                }
            }
            
            // Add any remaining accumulated lending income
            totalLendingIncome += accumulatedEnergyIncome + accumulatedBandwidthIncome;
            totalEnergyIncome += accumulatedEnergyIncome;
            totalBandwidthIncome += accumulatedBandwidthIncome;
            
            // Store final energy/bandwidth amounts for display
            window.finalEnergyStaked = currentEnergyStaked;
            window.finalBandwidthStaked = currentBandwidthStaked;
        } else {
            // No lending enabled - handle additional investments only with growth-adjusted pricing
            let totalAdditional = 0;
            if (additionalInvestment.frequencyDays > 0 && additionalInvestment.amountTRX > 0) {
                const totalInvestmentPeriods = Math.max(1, Math.floor(totalDays / additionalInvestment.frequencyDays));
                
                // Simulate day-by-day for growth-adjusted pricing
                let nextInvestmentDay = additionalInvestment.frequencyDays;
                let investmentCount = 0;
                
                for (let day = 1; day <= totalDays && investmentCount < totalInvestmentPeriods; day++) {
                    if (day === nextInvestmentDay) {
                        const dailyInvestment = getAdditionalInvestment(day, growthParams, initialTRXPrice);
                        totalAdditional += dailyInvestment.amountTRX;
                        investmentCount++;
                        nextInvestmentDay += additionalInvestment.frequencyDays;
                    }
                }
                
                // Update final stakes with additional investments using restake split
                const additionalEnergyStake = totalAdditional * restakeSplit.energyRatio;
                const additionalBandwidthStake = totalAdditional * restakeSplit.bandwidthRatio;
                
                window.finalEnergyStaked = stakingSplit.energy + additionalEnergyStake;
                window.finalBandwidthStaked = stakingSplit.bandwidth + additionalBandwidthStake;
            } else {
                // No additional investments - keep initial split
                window.finalEnergyStaked = stakingSplit.energy;
                window.finalBandwidthStaked = stakingSplit.bandwidth;
            }
        }
        
        const totalWithInvestments = trxAmount + totalAdditional;
        const finalTotal = totalWithInvestments + totalLendingIncome;
        
        // Calculate APYs for zero staking yield scenario
        const lendingAPY = totalDays > 0 ? (totalLendingIncome / trxAmount) * (365 / totalDays) * 100 : 0;
        const combinedAPY = lendingAPY; // When staking yield is 0, combined APY = lending APY
        
        updateResults(trxAmount, totalAdditional, totalWithInvestments, 0, finalTotal, combinedAPY, totalLendingIncome, 0, lendingAPY, totalEnergyIncome, totalBandwidthIncome, growthParams, initialTRXPrice, totalDays);
        highlightImportantResults();
        return;
    }
    
    // Calculate total time in years
    const totalYears = years + (months / 12);
    const totalDays = years * 365 + months * 30;
    
    // claimDays already declared at top of function
    
    // Calculate compound interest with additional investments and lending
    const r = stakingYield / 100; // Convert percentage to decimal
    // Use proper compounding frequency for consistency
    let n;
    if (claimDays === 1) n = 365; // Daily
    else if (claimDays === 7) n = 52; // Weekly
    else if (claimDays === 30) n = 12; // Monthly
    else if (claimDays === 90) n = 4; // Quarterly
    else n = 365 / claimDays; // Custom frequency
    const t = totalYears;
    
    console.log('Compounding frequency (n):', n, 'for claimDays:', claimDays);
    
    let totalAmount = trxAmount;
    let totalAdditionalInvestment = 0;
    let totalLendingIncome = 0;
    let totalEnergyIncome = 0;
    let totalBandwidthIncome = 0;
    let stakingPrincipal = trxAmount; // Initialize staking principal
    
    // Store period-by-period breakdown for modal - clear previous calculations
    window.calculationBreakdown = [];
    
    // Lending rates already declared above - removing duplicate declarations
    
    // Calculate actual energy and bandwidth units available
    let energyUnitsAvailable = 0;
    let bandwidthUnitsAvailable = 0;
    
    // Get network parameters to calculate actual units
    const energyPerStakedTRX = parseFormattedNumber(document.getElementById('energyPerStakedTRX').textContent);
    const bandwidthPerStakedTRX = parseFormattedNumber(document.getElementById('bandwidthPerStakedTRX').textContent);
    
    console.log('Network parameters loaded:', { energyPerStakedTRX, bandwidthPerStakedTRX });
    console.log('Staking split:', stakingSplit);
    console.log('Lending enabled:', lendingEnabled);
    console.log('Lending rates:', { energyLendingRate, bandwidthLendingRate });
    
    if (energyPerStakedTRX > 0) {
        energyUnitsAvailable = stakingSplit.energy * energyPerStakedTRX;
    }
    
    if (bandwidthPerStakedTRX > 0) {
        bandwidthUnitsAvailable = stakingSplit.bandwidth * bandwidthPerStakedTRX;
    }
    
    console.log('Energy/Bandwidth units:', { energyUnitsAvailable, bandwidthUnitsAvailable });
    
    
    // Daily lending income will be calculated dynamically based on current principal each period
    const totalDailyLendingIncome = lendingEnabled ? ((energyUnitsAvailable * energyLendingRate) + (bandwidthUnitsAvailable * bandwidthLendingRate)) / 1000000 : 0;
    
    
    if (additionalInvestment.frequencyDays > 0 && additionalInvestment.amountTRX > 0) {
        // Calculate with periodic additional investments and lending
        const totalInvestmentPeriods = Math.max(1, Math.floor(totalDays / additionalInvestment.frequencyDays));
        
        // Use daily simulation - simplified with single frequency
        stakingPrincipal = trxAmount; // Use function-scope variable
        let accumulatedStakingRewards = 0; // Track actual staking rewards earned
        let reinvestedLendingIncome = 0; // Track reinvested lending income
        let nextInvestmentDay = additionalInvestment.frequencyDays;
        let nextPayoutDay = claimDays; // Single frequency for both staking and lending
        let periodNumber = 1;
        
        // Track energy and bandwidth amounts separately - declare here for this code path
        let currentEnergyStaked = stakingSplit.energy;
        let currentBandwidthStaked = stakingSplit.bandwidth;
        
        // Accumulate lending income between payouts
        let accumulatedEnergyIncome = 0;
        let accumulatedBandwidthIncome = 0;
        
        for (let day = 1; day <= totalDays; day++) {
            // Calculate lending income based on current staking principal
            if (lendingEnabled) {
                // Use actual tracked energy/bandwidth stakes (updated with restake split)
                const currentEnergyUnits = energyPerStakedTRX > 0 ? currentEnergyStaked * energyPerStakedTRX : 0;
                const currentBandwidthUnits = bandwidthPerStakedTRX > 0 ? currentBandwidthStaked * bandwidthPerStakedTRX : 0;
                
                const dailyEnergyIncome = (currentEnergyUnits * energyLendingRate) / 1000000;
                const dailyBandwidthIncome = (currentBandwidthUnits * bandwidthLendingRate) / 1000000;
                
                accumulatedEnergyIncome += dailyEnergyIncome;
                accumulatedBandwidthIncome += dailyBandwidthIncome;
            }
            
            // Combined payout and staking day - single frequency
            if (day === nextPayoutDay) {
                const initialAmountThisPeriod = stakingPrincipal;
                let energyIncomeThisPeriod = accumulatedEnergyIncome;
                let bandwidthIncomeThisPeriod = accumulatedBandwidthIncome;
                
                // Process lending payouts and reinvest immediately
                if (lendingEnabled) {
                    totalLendingIncome += accumulatedEnergyIncome + accumulatedBandwidthIncome;
                    totalEnergyIncome += accumulatedEnergyIncome;
                    totalBandwidthIncome += accumulatedBandwidthIncome;
                    
                    // Reinvest lending income using restake split ratios
                    const totalLendingPayout = accumulatedEnergyIncome + accumulatedBandwidthIncome;
                    const lendingEnergyReinvest = totalLendingPayout * restakeSplit.energyRatio;
                    const lendingBandwidthReinvest = totalLendingPayout * restakeSplit.bandwidthRatio;
                    
                    currentEnergyStaked += lendingEnergyReinvest;
                    currentBandwidthStaked += lendingBandwidthReinvest;
                    stakingPrincipal += totalLendingPayout;
                    reinvestedLendingIncome += totalLendingPayout;
                    
                    accumulatedEnergyIncome = 0;
                    accumulatedBandwidthIncome = 0;
                }
                
                // Process staking rewards and reinvest using restake split ratios
                const stakingReward = stakingPrincipal * (r / n);
                const rewardEnergyReinvest = stakingReward * restakeSplit.energyRatio;
                const rewardBandwidthReinvest = stakingReward * restakeSplit.bandwidthRatio;
                
                currentEnergyStaked += rewardEnergyReinvest;
                currentBandwidthStaked += rewardBandwidthReinvest;
                stakingPrincipal += stakingReward;
                accumulatedStakingRewards += stakingReward;
                
                // Store period breakdown
                window.calculationBreakdown.push({
                    period: periodNumber,
                    initialAmount: initialAmountThisPeriod,
                    stakingReward: stakingReward,
                    energyIncome: energyIncomeThisPeriod,
                    bandwidthIncome: bandwidthIncomeThisPeriod,
                    finalAmount: stakingPrincipal
                });
                
                periodNumber++;
                nextPayoutDay += claimDays;
            }
            
            // Additional investment day - calculate using day-specific TRX price for growth
            if (day === nextInvestmentDay && totalAdditionalInvestment < additionalInvestment.amountTRX * totalInvestmentPeriods) {
                // Get additional investment with growth-adjusted price for this day
                const dailyInvestment = getAdditionalInvestment(day, growthParams, initialTRXPrice);
                const additionalEnergyStake = dailyInvestment.amountTRX * restakeSplit.energyRatio;
                const additionalBandwidthStake = dailyInvestment.amountTRX * restakeSplit.bandwidthRatio;
                
                currentEnergyStaked += additionalEnergyStake;
                currentBandwidthStaked += additionalBandwidthStake;
                stakingPrincipal += dailyInvestment.amountTRX;
                totalAdditionalInvestment += dailyInvestment.amountTRX;
                nextInvestmentDay += additionalInvestment.frequencyDays;
            }
        }
        
        // Add any remaining accumulated lending income
        totalLendingIncome += accumulatedEnergyIncome + accumulatedBandwidthIncome;
        totalEnergyIncome += accumulatedEnergyIncome;
        totalBandwidthIncome += accumulatedBandwidthIncome;
        
        // Store final energy/bandwidth amounts for display
        window.finalEnergyStaked = currentEnergyStaked;
        window.finalBandwidthStaked = currentBandwidthStaked;
        
        // Total amount = staking principal + non-reinvested lending income
        totalAmount = stakingPrincipal + (totalLendingIncome - reinvestedLendingIncome);
        
    } else {
        // Standard compound interest with lending but no additional investments
        if (lendingEnabled && totalDailyLendingIncome > 0) {
            // Use daily simulation - simplified with single frequency
            stakingPrincipal = trxAmount; // Use function-scope variable
            let accumulatedStakingRewards = 0; // Track actual staking rewards earned
            let reinvestedLendingIncome = 0; // Track reinvested lending income separately
            let nextPayoutDay = claimDays; // Single frequency
            let periodNumber = 1;
            
            // Track energy and bandwidth amounts separately
            let currentEnergyStaked = stakingSplit.energy; // Initial split for period 1
            let currentBandwidthStaked = stakingSplit.bandwidth;
            
            let accumulatedEnergyIncome = 0;
            let accumulatedBandwidthIncome = 0;
            
            for (let day = 1; day <= totalDays; day++) {
                // Calculate lending income based on current energy/bandwidth stakes
                if (lendingEnabled && (energyLendingRate > 0 || bandwidthLendingRate > 0)) {
                    const currentEnergyUnits = energyPerStakedTRX > 0 ? currentEnergyStaked * energyPerStakedTRX : 0;
                    const currentBandwidthUnits = bandwidthPerStakedTRX > 0 ? currentBandwidthStaked * bandwidthPerStakedTRX : 0;
                    
                    const dailyEnergyIncome = (currentEnergyUnits * energyLendingRate) / 1000000;
                    const dailyBandwidthIncome = (currentBandwidthUnits * bandwidthLendingRate) / 1000000;
                    
                    accumulatedEnergyIncome += dailyEnergyIncome;
                    accumulatedBandwidthIncome += dailyBandwidthIncome;
                }
                
                // Combined payout and staking day
                if (day === nextPayoutDay) {
                    const initialAmountThisPeriod = stakingPrincipal;
                    let energyIncomeThisPeriod = accumulatedEnergyIncome;
                    let bandwidthIncomeThisPeriod = accumulatedBandwidthIncome;
                    
                    // Process lending payouts and reinvest using restake split
                    if (lendingEnabled) {
                        totalLendingIncome += accumulatedEnergyIncome + accumulatedBandwidthIncome;
                        totalEnergyIncome += accumulatedEnergyIncome;
                        totalBandwidthIncome += accumulatedBandwidthIncome;
                        
                        // Reinvest lending income using restake split ratios
                        const totalLendingPayout = accumulatedEnergyIncome + accumulatedBandwidthIncome;
                        const lendingEnergyReinvest = totalLendingPayout * restakeSplit.energyRatio;
                        const lendingBandwidthReinvest = totalLendingPayout * restakeSplit.bandwidthRatio;
                        
                        currentEnergyStaked += lendingEnergyReinvest;
                        currentBandwidthStaked += lendingBandwidthReinvest;
                        stakingPrincipal += totalLendingPayout;
                        reinvestedLendingIncome += totalLendingPayout;
                        
                        accumulatedEnergyIncome = 0;
                        accumulatedBandwidthIncome = 0;
                    }
                    
                    // Process staking rewards and reinvest using restake split
                    const stakingReward = stakingPrincipal * (r / n);
                    const rewardEnergyReinvest = stakingReward * restakeSplit.energyRatio;
                    const rewardBandwidthReinvest = stakingReward * restakeSplit.bandwidthRatio;
                    
                    currentEnergyStaked += rewardEnergyReinvest;
                    currentBandwidthStaked += rewardBandwidthReinvest;
                    stakingPrincipal += stakingReward;
                    accumulatedStakingRewards += stakingReward;
                    
                    // Store period breakdown
                    window.calculationBreakdown.push({
                        period: periodNumber,
                        initialAmount: initialAmountThisPeriod,
                        stakingReward: stakingReward,
                        energyIncome: energyIncomeThisPeriod,
                        bandwidthIncome: bandwidthIncomeThisPeriod,
                        finalAmount: stakingPrincipal
                    });
                    
                    periodNumber++;
                    nextPayoutDay += claimDays;
                }
            }
            
            // Add any remaining accumulated lending income
            totalLendingIncome += accumulatedEnergyIncome + accumulatedBandwidthIncome;
            totalEnergyIncome += accumulatedEnergyIncome;
            totalBandwidthIncome += accumulatedBandwidthIncome;
            
            // Store final energy/bandwidth amounts for display
            window.finalEnergyStaked = currentEnergyStaked;
            window.finalBandwidthStaked = currentBandwidthStaked;
            
            // Total amount = staking principal + non-reinvested lending income
            totalAmount = stakingPrincipal + (totalLendingIncome - reinvestedLendingIncome);
            
        } else {
            // No lending - simulate period-by-period to apply restake split correctly
            stakingPrincipal = trxAmount;
            let currentEnergyStaked = stakingSplit.energy; // Initial split for period 1 only
            let currentBandwidthStaked = stakingSplit.bandwidth;
            let totalAdditionalInvestment = 0;
            let nextInvestmentDay = additionalInvestment.frequencyDays;
            let nextPayoutDay = claimDays;
            
            // Simulate day by day to properly apply restake split from period 1 onwards
            for (let day = 1; day <= totalDays; day++) {
                // Staking payout day - apply restake split to rewards
                if (day === nextPayoutDay) {
                    const stakingReward = stakingPrincipal * (r / n);
                    const rewardEnergyPortion = stakingReward * restakeSplit.energyRatio;
                    const rewardBandwidthPortion = stakingReward * restakeSplit.bandwidthRatio;
                    
                    currentEnergyStaked += rewardEnergyPortion;
                    currentBandwidthStaked += rewardBandwidthPortion;
                    stakingPrincipal += stakingReward;
                    
                    nextPayoutDay += claimDays;
                }
                
                // Additional investment day - calculate using day-specific TRX price for growth
                if (additionalInvestment.frequencyDays > 0 && day === nextInvestmentDay &&
                    totalAdditionalInvestment < additionalInvestment.amountTRX * Math.floor(totalDays / additionalInvestment.frequencyDays)) {
                    
                    // Get additional investment with growth-adjusted price for this day
                    const dailyInvestment = getAdditionalInvestment(day, growthParams, initialTRXPrice);
                    const additionalEnergyStake = dailyInvestment.amountTRX * restakeSplit.energyRatio;
                    const additionalBandwidthStake = dailyInvestment.amountTRX * restakeSplit.bandwidthRatio;
                    
                    currentEnergyStaked += additionalEnergyStake;
                    currentBandwidthStaked += additionalBandwidthStake;
                    stakingPrincipal += dailyInvestment.amountTRX;
                    totalAdditionalInvestment += dailyInvestment.amountTRX;
                    nextInvestmentDay += additionalInvestment.frequencyDays;
                }
            }
            
            totalAmount = stakingPrincipal;
            window.finalEnergyStaked = currentEnergyStaked;
            window.finalBandwidthStaked = currentBandwidthStaked;
            
            console.log('No lending simulation completed - stakingPrincipal:', stakingPrincipal);
            console.log('Final splits:', { energy: currentEnergyStaked, bandwidth: currentBandwidthStaked });
        }
    }
    
    console.log('Before stakingRewards calculation:', {
        stakingPrincipal,
        trxAmount,
        totalAdditionalInvestment,
        lendingPath: lendingEnabled && totalDailyLendingIncome > 0
    });
    
    // Calculate pure staking rewards - only rewards on original investment + additional investments
    // When lending income is reinvested, rewards on that reinvested amount are lending benefits, not staking rewards
    let stakingRewards;
    if (lendingEnabled && totalDailyLendingIncome > 0) {
        // Calculate what staking rewards would be WITHOUT any reinvestment
        const baseAmount = trxAmount + totalAdditionalInvestment;
        const expectedStakingAmount = baseAmount * Math.pow((1 + r / n), (n * t));
        stakingRewards = expectedStakingAmount - baseAmount;
        console.log('Pure staking calculation - base:', baseAmount, 'expected:', expectedStakingAmount, 'rewards:', stakingRewards);
    } else {
        // No lending - standard calculation
        stakingRewards = stakingPrincipal - trxAmount - totalAdditionalInvestment;
    }
    
    // Ensure breakdown exists even if no lending
    if (!window.calculationBreakdown || window.calculationBreakdown.length === 0) {
        // Create simple breakdown for non-lending case
        const periods = Math.ceil(totalDays / claimDays);
        let currentPrincipal = trxAmount;
        window.calculationBreakdown = [];
        
        for (let period = 1; period <= periods; period++) {
            const initialAmountThisPeriod = currentPrincipal;
            const stakingReward = currentPrincipal * (r / n);
            currentPrincipal += stakingReward;
            
            window.calculationBreakdown.push({
                period: period,
                initialAmount: initialAmountThisPeriod,
                stakingReward: stakingReward,
                energyIncome: 0,
                bandwidthIncome: 0,
                finalAmount: currentPrincipal
            });
        }
    }
    
    console.log('Staking rewards calculated as:', stakingRewards);
    
    console.log('Final calculation values:', {
        stakingPrincipal,
        trxAmount,
        totalAdditionalInvestment,
        stakingRewards,
        totalLendingIncome,
        totalAmount,
        stakingYield,
        r,
        n
    });
    
    // Calculate individual APYs
    const stakingAPY = stakingYield > 0 ? (Math.pow((1 + r / n), n) - 1) * 100 : 0;
    const lendingAPY = totalDays > 0 ? (totalLendingIncome / trxAmount) * (365 / totalDays) * 100 : 0;
    
    console.log('APY calculations:', { stakingAPY, lendingAPY });
    
    // Calculate combined APY - sum of individual APYs or total return method
    let combinedAPY = 0;
    if (totalDays > 0) {
        if (stakingAPY > 0 || lendingAPY > 0) {
            // Use total return method for combined APY
            combinedAPY = ((totalAmount - trxAmount - totalAdditionalInvestment) / trxAmount) * (365 / totalDays) * 100;
        }
    }
    
    console.log('Final APYs:', { stakingAPY, lendingAPY, combinedAPY });
    
    // Update the display - pass growth parameters and timing info for USD calculations
    updateResults(trxAmount, totalAdditionalInvestment, trxAmount + totalAdditionalInvestment, stakingRewards, totalAmount, combinedAPY, totalLendingIncome, stakingAPY, lendingAPY, totalEnergyIncome, totalBandwidthIncome, growthParams, initialTRXPrice, totalDays);
    
    // Update energy and bandwidth availability
    updateEnergyBandwidthDisplay();
    
    // Add highlighting effect to important results
    highlightImportantResults();
    
    // Update calculation button states
    updateCalculationButtonStates();
}

// Update the state of calculation buttons based on whether duration is set
function updateCalculationButtonStates() {
    const years = parseInt(document.getElementById('years').value) || 0;
    const months = parseInt(document.getElementById('months').value) || 0;
    const hasDuration = years > 0 || months > 0;
    const hasBreakdown = window.calculationBreakdown && window.calculationBreakdown.length > 0;
    
    const tableButton = document.querySelector('button[onclick="showCalculationsModal()"]');
    const graphButton = document.querySelector('button[onclick="showGraphModal()"]');
    
    if (tableButton && graphButton) {
        if (hasDuration && hasBreakdown) {
            // Enable buttons
            tableButton.disabled = false;
            tableButton.style.opacity = '1';
            tableButton.style.cursor = 'pointer';
            tableButton.style.pointerEvents = 'auto';
            
            graphButton.disabled = false;
            graphButton.style.opacity = '1';
            graphButton.style.cursor = 'pointer';
            graphButton.style.pointerEvents = 'auto';
        } else {
            // Disable buttons
            tableButton.disabled = true;
            tableButton.style.opacity = '0.5';
            tableButton.style.cursor = 'not-allowed';
            tableButton.style.pointerEvents = 'none';
            
            graphButton.disabled = true;
            graphButton.style.opacity = '0.5';
            graphButton.style.cursor = 'not-allowed';
            graphButton.style.pointerEvents = 'none';
        }
    }
}

function updateResults(initial, additionalPrincipal, invested, rewards, total, combinedApy, lendingIncome = 0, stakingApy = 0, lendingApy = 0, energyIncome = 0, bandwidthIncome = 0, growthParams = null, initialTRXPrice = 0, totalDays = 0) {
    // Calculate additional investment per period
    const additionalInvestment = getAdditionalInvestment();
    const additionalPerPeriod = additionalInvestment.amountTRX;
    
    // Update TRX amounts
    document.getElementById('initialAmount').textContent = formatNumber(initial) + ' TRX';
    document.getElementById('additionalPrincipal').textContent = formatNumber(additionalPrincipal) + ' TRX';
    document.getElementById('investedAmount').textContent = formatNumber(invested) + ' TRX';
    document.getElementById('stakingRewards').textContent = formatNumber(rewards) + ' TRX';
    document.getElementById('totalAmount').textContent = formatNumber(total) + ' TRX';
    document.getElementById('lendingIncome').textContent = formatNumber(lendingIncome) + ' TRX';
    document.getElementById('energyIncome').textContent = formatNumber(energyIncome) + ' TRX';
    document.getElementById('bandwidthIncome').textContent = formatNumber(bandwidthIncome) + ' TRX';
    
    // Update APY values
    document.getElementById('stakingApy').textContent = formatNumber(stakingApy, 2) + '%';
    document.getElementById('lendingApy').textContent = formatNumber(lendingApy, 2) + '%';
    document.getElementById('combinedApy').textContent = formatNumber(combinedApy, 2) + '%';
    
    // Update Growth Rate display
    let growthRateText = '0%';
    if (growthParams && growthParams.enabled && growthParams.rate > 0) {
        const ratePercent = (growthParams.rate * 100).toFixed(1);
        let periodText = '';
        
        switch (growthParams.periodDays) {
            case 30: periodText = 'Monthly'; break;
            case 90: periodText = 'Quarterly'; break;
            case 180: periodText = 'Half Yearly'; break;
            case 365: periodText = 'Yearly'; break;
            default: periodText = `Every ${growthParams.periodDays} days`; break;
        }
        
        growthRateText = `${ratePercent}% ${periodText}`;
    }
    document.getElementById('growthRate').textContent = growthRateText;
    
    // Update final energy and bandwidth based on total amount
    updateFinalEnergyBandwidth(total);
    
    // Calculate USD values - use initial price for static values, final price for growth-affected values
    const initialPrice = initialTRXPrice || currentTRXPrice || 0;
    let finalPrice = initialPrice;
    
    // If TRX growth is enabled, calculate the final TRX price
    if (growthParams && growthParams.enabled && initialPrice > 0 && totalDays > 0) {
        finalPrice = calculateTRXPriceAtDay(totalDays, initialPrice, growthParams);
    }
    
    // Safely update USD elements with error checking
    const usdUpdates = [
        { id: 'initialAmountUSD', value: initial * initialPrice }, // Use initial price
        { id: 'additionalPrincipalUSD', value: additionalPrincipal * initialPrice }, // Mixed - approximation using initial price
        { id: 'investedAmountUSD', value: invested * initialPrice }, // Mixed - approximation using initial price
        { id: 'stakingRewardsUSD', value: rewards * finalPrice }, // Use final price (rewards valued at end)
        { id: 'totalAmountUSD', value: total * finalPrice }, // Use final price (final value)
        { id: 'lendingIncomeUSD', value: lendingIncome * finalPrice }, // Use final price (income valued at end)
        { id: 'energyIncomeUSD', value: energyIncome * finalPrice }, // Use final price (income valued at end)
        { id: 'bandwidthIncomeUSD', value: bandwidthIncome * finalPrice } // Use final price (income valued at end)
    ];
    
    usdUpdates.forEach(update => {
        const element = document.getElementById(update.id);
        if (element) {
            element.textContent = `($${formatNumber(update.value)})`;
        } else {
            console.log(`USD element not found: ${update.id}`);
        }
    });
    
    // Calculate monthly staking income from final total amount
    const stakingYieldValue = parseFloat(document.getElementById('stakingYield').value) || 0;
    let monthlyStakingIncome = 0;
    
    if (stakingYieldValue > 0 && total > 0) {
        // Calculate monthly income: (Final Total × Annual Yield) / 12
        const annualStakingIncome = total * (stakingYieldValue / 100);
        monthlyStakingIncome = annualStakingIncome / 12;
    }
    
    // Update monthly staking income display
    document.getElementById('stakingIncomeMonthly').textContent = formatNumber(monthlyStakingIncome) + ' TRX';
    
    // Update USD value for monthly staking income
    const monthlyStakingIncomeUSD = monthlyStakingIncome * finalPrice;
    const monthlyIncomeUSDElement = document.getElementById('stakingIncomeMonthlyUSD');
    if (monthlyIncomeUSDElement) {
        monthlyIncomeUSDElement.textContent = `($${formatNumber(monthlyStakingIncomeUSD)})`;
    }
    
    // Calculate monthly lending income from final total amount
    let monthlyLendingIncome = 0;
    
    // Check if lending is enabled and we have final staking amounts
    const lendingEnabled = document.getElementById('lendingMode').checked;
    if (lendingEnabled && window.finalEnergyStaked !== undefined && window.finalBandwidthStaked !== undefined) {
        // Get lending rates and network parameters
        const energyLendingRate = parseFloat(document.getElementById('energyLendingRate').value) || 0;
        const bandwidthLendingRate = parseFloat(document.getElementById('bandwidthLendingRate').value) || 0;
        const energyPerStakedTRX = parseFormattedNumber(document.getElementById('energyPerStakedTRX').textContent) || 0;
        const bandwidthPerStakedTRX = parseFormattedNumber(document.getElementById('bandwidthPerStakedTRX').textContent) || 0;
        
        // Calculate daily lending income from final stakes
        if (energyPerStakedTRX > 0 || bandwidthPerStakedTRX > 0) {
            const finalEnergyUnits = window.finalEnergyStaked * energyPerStakedTRX;
            const finalBandwidthUnits = window.finalBandwidthStaked * bandwidthPerStakedTRX;
            
            const dailyEnergyIncome = (finalEnergyUnits * energyLendingRate) / 1000000;
            const dailyBandwidthIncome = (finalBandwidthUnits * bandwidthLendingRate) / 1000000;
            
            // Convert to monthly (30 days)
            monthlyLendingIncome = (dailyEnergyIncome + dailyBandwidthIncome) * 30;
        }
    }
    
    // Update monthly lending income display
    document.getElementById('lendingIncomeMonthly').textContent = formatNumber(monthlyLendingIncome) + ' TRX';
    
    // Update USD value for monthly lending income
    const monthlyLendingIncomeUSD = monthlyLendingIncome * finalPrice;
    const monthlyLendingIncomeUSDElement = document.getElementById('lendingIncomeMonthlyUSD');
    if (monthlyLendingIncomeUSDElement) {
        monthlyLendingIncomeUSDElement.textContent = `($${formatNumber(monthlyLendingIncomeUSD)})`;
    }
}

function updateFinalEnergyBandwidth(totalTRXAmount) {
    // Check if elements exist first to prevent errors
    const energyFinalElement = document.getElementById('energyFinal');
    const bandwidthFinalElement = document.getElementById('bandwidthFinal');
    
    if (!energyFinalElement || !bandwidthFinalElement) {
        console.log('Energy/Bandwidth Final elements not found, skipping update');
        return;
    }
    
    // Get network parameters
    let energyPerStakedTRX = 0;
    let bandwidthPerStakedTRX = 0;
    
    const energyText = document.getElementById('energyPerStakedTRX').textContent;
    const bandwidthText = document.getElementById('bandwidthPerStakedTRX').textContent;
    
    if (energyText && energyText !== 'Loading...' && energyText !== '--') {
        energyPerStakedTRX = parseFormattedNumber(energyText);
    }
    
    if (bandwidthText && bandwidthText !== 'Loading...' && bandwidthText !== '--') {
        bandwidthPerStakedTRX = parseFormattedNumber(bandwidthText);
    }
    
    // Use global variables if available from calculation, otherwise fall back to proportional
    let finalEnergyTRX, finalBandwidthTRX;
    
    if (window.finalEnergyStaked !== undefined && window.finalBandwidthStaked !== undefined) {
        // Use actual tracked values from simulation
        finalEnergyTRX = window.finalEnergyStaked;
        finalBandwidthTRX = window.finalBandwidthStaked;
    } else {
        // Fall back to proportional calculation using current split
        const stakingSplit = getStakingSplit();
        const trxAmount = parseFloat(document.getElementById('trxAmount').value) || 0;
        
        let energyRatio = 0.5; // Default 50/50
        let bandwidthRatio = 0.5;
        
        if (trxAmount > 0) {
            energyRatio = stakingSplit.energy / trxAmount;
            bandwidthRatio = stakingSplit.bandwidth / trxAmount;
        }
        
        finalEnergyTRX = totalTRXAmount * energyRatio;
        finalBandwidthTRX = totalTRXAmount * bandwidthRatio;
    }
    
    // Calculate final energy and bandwidth units
    let finalEnergy = 0;
    let finalBandwidth = 0;
    
    if (energyPerStakedTRX > 0) {
        finalEnergy = finalEnergyTRX * energyPerStakedTRX;
    }
    
    if (bandwidthPerStakedTRX > 0) {
        finalBandwidth = finalBandwidthTRX * bandwidthPerStakedTRX;
    }
    
    // Update display safely
    energyFinalElement.textContent = formatNetworkNumber(finalEnergy);
    bandwidthFinalElement.textContent = formatNetworkNumber(finalBandwidth);
}

function updateEnergyBandwidthDisplay() {
    // Get network parameters - parse the formatted numbers
    let energyPerStakedTRX = 0;
    let bandwidthPerStakedTRX = 0;
    
    const energyText = document.getElementById('energyPerStakedTRX').textContent;
    const bandwidthText = document.getElementById('bandwidthPerStakedTRX').textContent;
    
    // Parse formatted numbers (handle K, M, B, T suffixes)
    if (energyText && energyText !== 'Loading...' && energyText !== '--') {
        energyPerStakedTRX = parseFormattedNumber(energyText);
    }
    
    if (bandwidthText && bandwidthText !== 'Loading...' && bandwidthText !== '--') {
        bandwidthPerStakedTRX = parseFormattedNumber(bandwidthText);
    }
    
    // Get current staking split (this is always the initial split for display)
    const stakingSplit = getStakingSplit();
    
    // Calculate available energy and bandwidth for initial amounts
    let energyAvailable = 0;
    let bandwidthAvailable = 0;
    
    if (energyPerStakedTRX > 0 && stakingSplit.energy > 0) {
        energyAvailable = energyPerStakedTRX * stakingSplit.energy;
    }
    
    if (bandwidthPerStakedTRX > 0 && stakingSplit.bandwidth > 0) {
        bandwidthAvailable = bandwidthPerStakedTRX * stakingSplit.bandwidth;
    }
    
    // Update display - these show the initial available amounts
    document.getElementById('energyAvailable').textContent = formatNetworkNumber(energyAvailable);
    document.getElementById('bandwidthAvailable').textContent = formatNetworkNumber(bandwidthAvailable);
}

function parseFormattedNumber(text) {
    if (!text || text === 'Loading...' || text === '--') return 0;
    
    const num = parseFloat(text);
    if (text.includes('T')) return num * 1000000000000;
    if (text.includes('B')) return num * 1000000000;
    if (text.includes('M')) return num * 1000000;
    if (text.includes('K')) return num * 1000;
    return num;
}

function formatNumber(num, decimals = 2) {
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

// Add highlighting effect to important results after calculation
function highlightImportantResults() {
    // Remove existing highlights
    document.querySelectorAll('.result-item').forEach(item => {
        item.classList.remove('highlight');
    });
    
    // Add highlight to Final Total and Combined APY by finding elements with specific IDs
    setTimeout(() => {
        const finalTotalItem = document.getElementById('totalAmount')?.closest('.result-item');
        const combinedAPYItem = document.getElementById('combinedApy')?.closest('.result-item');
        
        console.log('Highlighting elements:', {finalTotalItem, combinedAPYItem});
        
        if (finalTotalItem) {
            finalTotalItem.classList.add('highlight');
            console.log('Final Total highlighted');
        }
        
        if (combinedAPYItem) {
            setTimeout(() => {
                combinedAPYItem.classList.add('highlight');
                console.log('Combined APY highlighted');
            }, 300); // Stagger the animation
        }
    }, 200); // Reduced delay
}

// Modal functions
function showCalculationsModal() {
    // Check if calculation breakdown exists - but don't show alert since button should be disabled
    if (!window.calculationBreakdown || window.calculationBreakdown.length === 0) {
        return;
    }
    
    generateCalculationsTable();
    document.getElementById('calculationsModal').style.display = 'block';
}

function showGraphModal() {
    // Check if calculation breakdown exists - but don't show alert since button should be disabled
    if (!window.calculationBreakdown || window.calculationBreakdown.length === 0) {
        return;
    }
    
    document.getElementById('graphModal').style.display = 'block';
    // Generate chart after modal is visible
    setTimeout(() => generateChart(), 100);
}

function closeCalculationsModal() {
    document.getElementById('calculationsModal').style.display = 'none';
}

function closeGraphModal() {
    document.getElementById('graphModal').style.display = 'none';
}

function closeModal(event) {
    if (event.target === event.currentTarget) {
        const calculationsModal = document.getElementById('calculationsModal');
        const graphModal = document.getElementById('graphModal');
        
        if (calculationsModal && calculationsModal.style.display === 'block') {
            closeCalculationsModal();
        }
        if (graphModal && graphModal.style.display === 'block') {
            closeGraphModal();
        }
    }
}

// Custom Modal Functions
function showError(message) {
    document.getElementById('errorMessage').innerHTML = message;
    document.getElementById('errorModal').style.display = 'block';
}

function showSuccess(message) {
    document.getElementById('successMessage').innerHTML = message;
    document.getElementById('successModal').style.display = 'block';
}

function closeErrorModal() {
    document.getElementById('errorModal').style.display = 'none';
}

function closeSuccessModal() {
    document.getElementById('successModal').style.display = 'none';
}

// Replace browser alerts with custom modals
function customAlert(message) {
    if (message.includes('✅') || message.toLowerCase().includes('success')) {
        showSuccess('✅ ' + message.replace('✅ ', ''));
    } else if (message.includes('⚠️') || message.toLowerCase().includes('error')) {
        showError('⚠️ ' + message.replace('⚠️ ', ''));
    } else {
        showError('⚠️ ' + message);
    }
}

function generateCalculationsTable() {
    const container = document.getElementById('calculationsTableContainer');
    const breakdown = window.calculationBreakdown;
    
    // Get growth parameters and pricing info for USD calculations
    const growthParams = getGrowthParameters();
    const initialTRXPrice = currentTRXPrice || 0;
    const claimDays = getClaimFrequencyDays();
    
    let tableHTML = `
        <table class="calculations-table">
            <thead>
                <tr>
                    <th>Period</th>
                    <th>Initial Amount</th>
                    <th>Staking Reward</th>
                    <th>Energy Income</th>
                    <th>Bandwidth Income</th>
                    <th>Final Amount</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    let totalStakingRewards = 0;
    let totalEnergyIncome = 0;
    let totalBandwidthIncome = 0;
    
    breakdown.forEach(period => {
        totalStakingRewards += period.stakingReward;
        totalEnergyIncome += period.energyIncome;
        totalBandwidthIncome += period.bandwidthIncome;
        
        // Calculate USD values for this period
        const periodDay = period.period * claimDays;
        let trxPrice = initialTRXPrice;
        if (growthParams && growthParams.enabled && initialTRXPrice > 0) {
            trxPrice = calculateTRXPriceAtDay(periodDay, initialTRXPrice, growthParams);
        }
        
        const initialUSD = period.initialAmount * trxPrice;
        const rewardUSD = period.stakingReward * trxPrice;
        const energyUSD = period.energyIncome * trxPrice;
        const bandwidthUSD = period.bandwidthIncome * trxPrice;
        const finalUSD = period.finalAmount * trxPrice;
        
        tableHTML += `
            <tr>
                <td class="period-number">Period ${period.period}</td>
                <td class="amount-value">
                    ${formatNumber(period.initialAmount)} TRX
                    <div style="font-size: 0.65rem; color: #ce9178; margin-top: 2px;">($${formatNumber(initialUSD)})</div>
                </td>
                <td class="amount-value">
                    ${formatNumber(period.stakingReward)} TRX
                    <div style="font-size: 0.65rem; color: #ce9178; margin-top: 2px;">($${formatNumber(rewardUSD)})</div>
                </td>
                <td class="amount-value">
                    ${formatNumber(period.energyIncome)} TRX
                    <div style="font-size: 0.65rem; color: #ce9178; margin-top: 2px;">($${formatNumber(energyUSD)})</div>
                </td>
                <td class="amount-value">
                    ${formatNumber(period.bandwidthIncome)} TRX
                    <div style="font-size: 0.65rem; color: #ce9178; margin-top: 2px;">($${formatNumber(bandwidthUSD)})</div>
                </td>
                <td class="amount-value">
                    ${formatNumber(period.finalAmount)} TRX
                    <div style="font-size: 0.65rem; color: #ce9178; margin-top: 2px;">($${formatNumber(finalUSD)})</div>
                </td>
            </tr>
        `;
    });
    
    // Add totals row
    const finalAmount = breakdown[breakdown.length - 1].finalAmount;
    const finalPeriodDay = breakdown.length * claimDays;
    let finalTRXPrice = initialTRXPrice;
    if (growthParams && growthParams.enabled && initialTRXPrice > 0) {
        finalTRXPrice = calculateTRXPriceAtDay(finalPeriodDay, initialTRXPrice, growthParams);
    }
    
    const totalRewardsUSD = totalStakingRewards * finalTRXPrice;
    const totalEnergyUSD = totalEnergyIncome * finalTRXPrice;
    const totalBandwidthUSD = totalBandwidthIncome * finalTRXPrice;
    const finalAmountUSD = finalAmount * finalTRXPrice;
    
    tableHTML += `
            <tr class="total-row">
                <td><strong>TOTALS</strong></td>
                <td class="amount-value"><strong>-</strong></td>
                <td class="amount-value">
                    <strong>${formatNumber(totalStakingRewards)} TRX</strong>
                    <div style="font-size: 0.65rem; color: #ce9178; margin-top: 2px;"><strong>($${formatNumber(totalRewardsUSD)})</strong></div>
                </td>
                <td class="amount-value">
                    <strong>${formatNumber(totalEnergyIncome)} TRX</strong>
                    <div style="font-size: 0.65rem; color: #ce9178; margin-top: 2px;"><strong>($${formatNumber(totalEnergyUSD)})</strong></div>
                </td>
                <td class="amount-value">
                    <strong>${formatNumber(totalBandwidthIncome)} TRX</strong>
                    <div style="font-size: 0.65rem; color: #ce9178; margin-top: 2px;"><strong>($${formatNumber(totalBandwidthUSD)})</strong></div>
                </td>
                <td class="amount-value">
                    <strong>${formatNumber(finalAmount)} TRX</strong>
                    <div style="font-size: 0.65rem; color: #ce9178; margin-top: 2px;"><strong>($${formatNumber(finalAmountUSD)})</strong></div>
                </td>
            </tr>
        </tbody>
    </table>
    `;
    
    container.innerHTML = tableHTML;
}

function generateChart() {
    if (!window.calculationBreakdown || window.calculationBreakdown.length === 0) {
        return;
    }
    
    // Get both canvas elements
    const trxCanvas = document.getElementById('trxChart');
    const usdCanvas = document.getElementById('usdChart');
    
    if (!trxCanvas || !usdCanvas) {
        console.error('Chart canvases not found');
        return;
    }
    
    const trxCtx = trxCanvas.getContext('2d');
    const usdCtx = usdCanvas.getContext('2d');
    
    // Clear both canvases
    trxCtx.clearRect(0, 0, trxCanvas.width, trxCanvas.height);
    usdCtx.clearRect(0, 0, usdCanvas.width, usdCanvas.height);
    
    // Get data for calculations
    const trxAmount = parseFloat(document.getElementById('trxAmount').value) || 0;
    const periods = window.calculationBreakdown;
    const growthParams = getGrowthParameters();
    const initialTRXPrice = currentTRXPrice || 0;
    const claimDays = getClaimFrequencyDays();
    
    // Calculate TRX values
    const trxValues = [trxAmount, ...periods.map(p => p.finalAmount)];
    const maxTRXAmount = Math.max(...trxValues);
    const minTRXAmount = Math.min(...trxValues);
    
    // Calculate USD values for each period
    const usdValues = [];
    usdValues.push(trxAmount * initialTRXPrice); // Initial amount
    
    periods.forEach((period, index) => {
        const periodDay = (index + 1) * claimDays;
        let trxPrice = initialTRXPrice;
        if (growthParams && growthParams.enabled && initialTRXPrice > 0) {
            trxPrice = calculateTRXPriceAtDay(periodDay, initialTRXPrice, growthParams);
        }
        usdValues.push(period.finalAmount * trxPrice);
    });
    
    const maxUSDAmount = Math.max(...usdValues);
    const minUSDAmount = Math.min(...usdValues);
    
    // Generate TRX Chart
    generateSingleChart(trxCtx, trxCanvas, trxValues, minTRXAmount, maxTRXAmount, 'TRX', '#52d273');
    
    // Generate USD Chart
    generateSingleChart(usdCtx, usdCanvas, usdValues, minUSDAmount, maxUSDAmount, 'USD', '#ce9178');
    
    // Update legend
    const legendEl = document.getElementById('chartLegend');
    const totalTRXGrowth = ((trxValues[trxValues.length - 1] / trxAmount) - 1) * 100;
    const totalUSDGrowth = ((usdValues[usdValues.length - 1] / usdValues[0]) - 1) * 100;
    
    legendEl.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; gap: 30px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 5px;">
                <div style="width: 12px; height: 12px; background: #52d273; border-radius: 2px;"></div>
                <span>TRX Growth: ${totalTRXGrowth.toFixed(1)}%</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
                <div style="width: 12px; height: 12px; background: #ce9178; border-radius: 2px;"></div>
                <span>USD Growth: ${totalUSDGrowth.toFixed(1)}%</span>
            </div>
            <div style="color: var(--muted);">
                Claim/Reinvest every ${claimDays} days
            </div>
        </div>
    `;
}

function generateSingleChart(ctx, canvas, values, minAmount, maxAmount, unit, color) {
    // Set canvas styles first to measure text accurately
    ctx.fillStyle = '#e9f0ff';
    ctx.font = '10px JetBrains Mono';
    
    // Calculate maximum label width first
    let maxLabelWidth = 0;
    const labelTexts = [];
    
    for (let i = 0; i <= 5; i++) {
        const value = minAmount + (maxAmount - minAmount) * (i / 5);
        const labelText = unit === 'USD' ? '$' + formatNumber(value) : formatNumber(value);
        labelTexts.push(labelText);
        
        const textWidth = ctx.measureText(labelText).width;
        maxLabelWidth = Math.max(maxLabelWidth, textWidth);
    }
    
    // Get base unit for responsive spacing with fallback
    let baseUnit = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--base-unit'));
    
    // Fallback to 1.8px if baseUnit is invalid
    if (isNaN(baseUnit) || baseUnit <= 0) {
        baseUnit = 1.8; // Default base unit value
    }
    
    // Chart dimensions and margins - set left margin based on label width
    const margin = {
        top: 30,
        right: 40,
        bottom: 50,
        left: maxLabelWidth + Math.max(15, baseUnit * 8.33) // Label width + responsive gap (min 15px)
    };
    const chartWidth = canvas.width - margin.left - margin.right;
    const chartHeight = canvas.height - margin.top - margin.bottom;
    
    // Scale functions
    const xScale = (index) => margin.left + (index / (values.length - 1)) * chartWidth;
    const yScale = (amount) => margin.top + (1 - (amount - minAmount) / (maxAmount - minAmount)) * chartHeight;
    
    // Calculate smart label spacing
    const maxLabels = 8;
    const labelStep = Math.max(1, Math.ceil(values.length / maxLabels));
    
    // Draw grid lines and labels
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#9fb0d0';
    
    // Y-axis labels and grid
    for (let i = 0; i <= 5; i++) {
        const value = minAmount + (maxAmount - minAmount) * (i / 5);
        const y = yScale(value);
        
        // Grid line
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(margin.left + chartWidth, y);
        ctx.stroke();
        
        // Label - position with responsive gap from chart area
        ctx.textAlign = 'right';
        const labelText = labelTexts[i];
        const labelX = margin.left - Math.max(10, baseUnit * 5.56); // ~10px responsive gap (min 10px)
        ctx.fillText(labelText, labelX, y + 4);
    }
    
    // X-axis labels and grid
    ctx.textAlign = 'center';
    for (let i = 0; i < values.length; i++) {
        const x = xScale(i);
        
        // Grid line
        ctx.beginPath();
        ctx.moveTo(x, margin.top);
        ctx.lineTo(x, margin.top + chartHeight);
        ctx.stroke();
        
        // Label - show every labelStep or first/last
        if (i % labelStep === 0 || i === 0 || i === values.length - 1) {
            ctx.fillText(`P${i}`, x, margin.top + chartHeight + 20);
        }
    }
    
    // Draw area chart
    ctx.fillStyle = color + '33'; // Add transparency
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(xScale(0), yScale(values[0]));
    
    // Draw the growth line
    values.forEach((value, index) => {
        ctx.lineTo(xScale(index), yScale(value));
    });
    
    // Close the area
    ctx.lineTo(xScale(values.length - 1), margin.top + chartHeight);
    ctx.lineTo(xScale(0), margin.top + chartHeight);
    ctx.closePath();
    ctx.fill();
    
    // Draw the line
    ctx.beginPath();
    ctx.moveTo(xScale(0), yScale(values[0]));
    values.forEach((value, index) => {
        ctx.lineTo(xScale(index), yScale(value));
    });
    ctx.stroke();
    
    // Draw data points
    ctx.fillStyle = color;
    values.forEach((value, index) => {
        const x = xScale(index);
        const y = yScale(value);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
    });
    
    // Draw axes
    ctx.strokeStyle = '#e9f0ff';
    ctx.lineWidth = 2;
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + chartHeight);
    ctx.stroke();
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + chartHeight);
    ctx.lineTo(margin.left + chartWidth, margin.top + chartHeight);
    ctx.stroke();
    
    // Axis labels
    ctx.fillStyle = '#e9f0ff';
    ctx.font = '11px JetBrains Mono';
    ctx.textAlign = 'center';
    
    // X-axis label
    ctx.save();
    ctx.translate(margin.left + chartWidth / 2, canvas.height - 15);
    ctx.fillText('Periods', 0, 0);
    ctx.restore();
    
    // Y-axis label
    ctx.save();
    ctx.translate(15, margin.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(unit === 'USD' ? 'USD Value' : 'TRX Balance', 0, 0);
    ctx.restore();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Fetch TRX price and network stats
    getTRXPrice();
    getTRONNetworkStats();
    
    // Fetch SR data for dropdown - disable if API fails
    fetchSRData();
    
    // Refresh price every 60 seconds
    setInterval(getTRXPrice, 60000);
    
    // Refresh network stats every 2 minutes
    setInterval(getTRONNetworkStats, 120000);
    
    // Refresh SR data every 5 minutes
    setInterval(fetchSRData, 300000);
    
    // Initialize staking split functionality
    updateStakingSplit();
    updateRatioDisplay();
    updateRestakeRatioDisplay();
    updateAdditionalInvestmentState();
    updateHelpIconsVisibility();
    
    // Initialize lending functionality
    toggleLendingMode();
    
    // Initialize growth functionality
    toggleGrowthMode();
    
    // Initialize claim frequency layout
    toggleCustomDays();
    
    // Initialize calculation button states
    updateCalculationButtonStates();
    
    // Add enter key support
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                calculateYield();
            }
        });
    });
});