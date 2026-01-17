
let currentFLRPrice = null;

// Fetch FLR price on load
async function getFLRPrice() {
    try {
        const response = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=flare-networks&vs_currencies=usd"
        );
        const data = await response.json();
        currentFLRPrice = data['flare-networks'].usd;
        document.getElementById("currentPrice").textContent = "$" + currentFLRPrice.toFixed(4);
        updateAdditionalInvestmentState();
        // Update connection status to show successful price fetch
        updatePriceConnectionStatus(true);
    } catch (err) {
        document.getElementById("currentPrice").textContent = "-- USD";
        console.error("Error loading FLR price:", err);
        updateAdditionalInvestmentState();
        // Update connection status to show manual entry instruction
        updatePriceConnectionStatus(false);
    }
}

function updateAddressInputStatus(isOnline) {
    const statusElement = document.getElementById('connectionStatus');
    const addressInput = document.getElementById('flrAddress');
    const fetchButton = document.getElementById('fetchDataBtn');
    const addressSection = document.getElementById('addressInputSection');
    
    if (isOnline) {
        // Check if FLR price is available
        if (currentFLRPrice !== null && currentFLRPrice > 0) {
            statusElement.textContent = 'Online - Address input enabled';
        } else {
            statusElement.textContent = 'Online - Address input enabled, FLR price: click price box to enter manually';
        }
        statusElement.className = 'connection-status online';
        addressInput.disabled = false;
        fetchButton.disabled = false;
        addressSection.classList.remove('offline');
    } else {
        if (currentFLRPrice !== null && currentFLRPrice > 0) {
            statusElement.textContent = 'Offline - Click FLR price box to enter manually if needed';
        } else {
            statusElement.textContent = 'Offline - Click FLR price box to enter manually';
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

function enableManualPrice() {
    document.getElementById('currentPrice').style.display = 'none';
    document.getElementById('manualPriceInput').style.display = 'flex';
    document.getElementById('manualPrice').focus();
}

function updateManualPrice() {
    const manualPrice = parseFloat(document.getElementById('manualPrice').value) || 0;
    if (manualPrice > 0) {
        currentFLRPrice = manualPrice;
        updateAdditionalInvestmentState();
    }
}

function confirmManualPrice() {
    const manualPrice = parseFloat(document.getElementById('manualPrice').value) || 0;
    if (manualPrice > 0) {
        currentFLRPrice = manualPrice;
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

async function fetchFLRData() {
    const address = document.getElementById('flrAddress').value.trim();
    
    if (!address) {
        customAlert('Please enter a FLR address');
        return;
    }
    
    if (!address.startsWith('0x') || address.length !== 42) {
        customAlert('Please enter a valid FLR address (should start with 0x and be 42 characters long)');
        return;
    }
    
    // Show loading state
    const fetchButton = document.getElementById('fetchDataBtn');
    const originalText = fetchButton.textContent;
    fetchButton.textContent = 'Fetching...';
    fetchButton.disabled = true;
    
    try {
        console.log('🔥 Fetching Flare data via contract calls for address:', address);
        
        // Use direct contract interaction approach
        const accountData = await fetchFlareAccountDataDirect(address);
        
        console.log('🎯 Complete Flare account data:', accountData);
        
        // Auto-populate calculator instead of opening new tab
        await autoPopulateCalculator(accountData);
        
        console.log('✅ Data fetched and calculator auto-populated successfully!');
        console.log(`WFLR Balance: ${parseFloat(accountData.wflr.balanceWFLR_est).toFixed(2)} FLR`);
        console.log(`FTSOs: ${accountData.ftsoDelegation.delegates.length}`);
        console.log(`Delegations: ${accountData.ftsoDelegation.delegates.map(d => `${d.sharePct}%`).join(' + ')}`);
        
    } catch (error) {
        console.error('💥 Error fetching FLR data:', error);
        customAlert('Error fetching data: ' + error.message + '\n\nPlease check your internet connection and try again.');
    } finally {
        // Restore button state
        fetchButton.textContent = originalText;
        fetchButton.disabled = false;
    }
}

// Direct contract interaction approach (from test.html)
async function fetchFlareAccountDataDirect(address) {
    console.log('🚀 Using direct contract interaction approach...');
    
    // Load Web3 if not already loaded
    if (typeof Web3 === 'undefined') {
        console.log('📦 Loading Web3 library...');
        await loadWeb3Library();
    }
    
    const RPC = "https://flare-api.flare.network/ext/C/rpc";
    const WNAT = "0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d";
    
    // Minimal ABI for WFLR contract
    const WNAT_ABI = [
        {
            "constant": true,
            "inputs": [{ "name": "account", "type": "address" }],
            "name": "balanceOf",
            "outputs": [{ "name": "", "type": "uint256" }],
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [{ "name": "_delegator", "type": "address" }],
            "name": "delegatesOf",
            "outputs": [
                { "name": "_delegateAddresses", "type": "address[]" },
                { "name": "_bips", "type": "uint256[]" },
                { "name": "_count", "type": "uint256" }
            ],
            "type": "function"
        }
    ];
    
    const w3 = new Web3(RPC);
    const wnat = new w3.eth.Contract(WNAT_ABI, WNAT);
    
    console.log('💰 Fetching FLR balance...');
    const flrWei = await w3.eth.getBalance(address);
    const flrWeiStr = String(flrWei);
    
    console.log('🎯 Fetching WFLR balance...');
    const wflrRaw = await wnat.methods.balanceOf(address).call();
    const wflrRawStr = String(wflrRaw);
    
    console.log('🎲 Fetching FTSO delegations...');
    const del = await wnat.methods.delegatesOf(address).call();
    
    const delegateAddresses = del._delegateAddresses || del[0] || [];
    const bips = del._bips || del[1] || [];
    
    console.log(`🎯 Found ${delegateAddresses.length} delegate addresses:`, delegateAddresses);
    console.log('📊 Delegation bips:', bips.map(b => String(b)));
    
    const delegates = delegateAddresses.map((addr, i) => {
        const bpBig = BigInt(bips[i] ?? 0);
        const bpStr = bpBig.toString();
        const pct = Number(bpBig) / 100;
        
        console.log(`✅ Delegate ${i + 1}: ${addr} - ${pct}%`);
        
        return {
            address: addr,
            shareBP: bpStr,
            sharePct: pct
        };
    });
    
    const totalBPBig = delegates
        .map(d => BigInt(d.shareBP))
        .reduce((acc, x) => acc + x, 0n);
    
    return {
        address,
        rpc: RPC,
        contracts: { WNat_WFLR: WNAT },
        
        flr: {
            balanceWei: flrWeiStr,
            balanceFLR_est: intToDecimalStr(flrWeiStr, 18)
        },
        
        wflr: {
            balanceRaw: wflrRawStr,
            balanceWFLR_est: intToDecimalStr(wflrRawStr, 18)
        },
        
        ftsoDelegation: {
            delegates,
            totalDelegatedBP: totalBPBig.toString(),
            totalDelegatedPct: Number(totalBPBig) / 100
        }
    };
}

// Helper function from test.html
function intToDecimalStr(intStr, decimals = 18) {
    const s0 = String(intStr ?? "0");
    const s = s0.replace(/^0+/, "") || "0";
    
    if (decimals === 0) return s;
    
    const pad = s.padStart(decimals + 1, "0");
    const whole = pad.slice(0, -decimals).replace(/^0+/, "") || "0";
    let frac = pad.slice(-decimals).replace(/0+$/, "");
    
    return frac ? `${whole}.${frac}` : whole;
}

// Load Web3 library dynamically
async function loadWeb3Library() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/web3@4.16.0/dist/web3.min.js';
        script.onload = () => {
            console.log('✅ Web3 library loaded successfully');
            resolve();
        };
        script.onerror = () => {
            console.error('💥 Failed to load Web3 library');
            reject(new Error('Failed to load Web3 library'));
        };
        document.head.appendChild(script);
    });
}

// Auto-populate calculator based on fetched data
async function autoPopulateCalculator(data) {
    console.log('🎯 Auto-populating calculator with:', data);
    
    // 1. Set WFLR amount in current amount field
    const wflrBalance = parseFloat(data.wflr.balanceWFLR_est);
    document.getElementById('flrAmount').value = wflrBalance.toFixed(6);
    console.log(`💰 Set FLR amount: ${wflrBalance.toFixed(6)} FLR`);
    
    // 2. Set number of FTSOs based on delegates
    const numDelegates = data.ftsoDelegation.delegates.length;
    console.log(`🎲 Setting FTSO count to: ${numDelegates}`);
    
    if (numDelegates >= 1 && numDelegates <= 2) {
        setFTSOCount(numDelegates);
        
        // 3. Switch to auto mode for reward rates
        console.log('🤖 Switching to auto mode...');
        document.getElementById('rewardRateMode').checked = true;
        toggleRewardRateMode();
        
        // Wait for FTSO providers to load
        if (ftsoProviders.length === 0) {
            console.log('📦 Loading FTSO providers first...');
            await loadFTSOProviders();
        }
        
        // 4. Match delegate addresses to FTSO providers and set rates
        console.log('🔍 Matching delegates to FTSO providers...');
        console.log('📋 Available FTSO providers:', ftsoProviders.length);
        console.log('🎯 First few providers:', ftsoProviders.slice(0, 5).map(p => ({ name: p.name, address: p.address })));
        
        for (let i = 0; i < numDelegates && i < 2; i++) {
            const delegate = data.ftsoDelegation.delegates[i];
            console.log(`🔍 Looking for delegate ${i + 1}: ${delegate.address}`);
            
            // Match using delegation address (not identity address)
            const provider = ftsoProviders.find(p =>
                p.delegationAddress?.toLowerCase() === delegate.address.toLowerCase()
            );
            
            if (provider) {
                console.log(`✅ Found provider for delegate ${i + 1}:`, provider);
                document.getElementById(`ftsoReward${i + 1}`).value = provider.rewardRate.toFixed(8);
                // Update FTSO info display
                updateFTSOInfoDisplay(i + 1, provider);
            } else {
                console.log(`❌ Provider not found for delegate ${i + 1}: ${delegate.address}`);
                console.log(`📋 Checking all provider addresses:`, ftsoProviders.map(p => p.address));
                
                // Better fallback - show abbreviated address and mark as unknown
                const placeholderProvider = {
                    name: `Unknown Provider`,
                    address: delegate.address,
                    displayName: `Unknown (${delegate.address.slice(0, 6)}...${delegate.address.slice(-4)})`
                };
                // Use a default rate and update display
                document.getElementById(`ftsoReward${i + 1}`).value = '0.00068308'; // Example rate
                updateFTSOInfoDisplay(i + 1, placeholderProvider);
            }
        }
        
        // 5. Set ratio slider for 2 FTSOs
        if (numDelegates === 2) {
            const ftso1Share = data.ftsoDelegation.delegates[0].sharePct;
            const ftso2Share = data.ftsoDelegation.delegates[1].sharePct;
            
            // Slider value represents FTSO 2 percentage (right side)
            const sliderValue = ftso2Share;
            document.getElementById('ftsoRatioSlider').value = sliderValue;
            updateFTSORatioDisplay();
            
            console.log(`⚖️  Set ratio slider: FTSO1 ${ftso1Share}% / FTSO2 ${ftso2Share}%`);
        }
        
        // 6. Calculate yield with new settings
        console.log('🧮 Updating yield calculation...');
        calculateAndUpdateYield();
        
    } else {
        console.log(`⚠️  Unsupported number of delegates: ${numDelegates} (only 1-2 supported)`);
        customAlert(`Found ${numDelegates} FTSO delegations. This calculator supports 1-2 FTSOs only.`);
    }
}

// Old display functions removed - now auto-populating calculator instead

function updateAdditionalInvestmentState() {
    const hasFLRPrice = currentFLRPrice !== null && currentFLRPrice > 0;
    const additionalInputs = document.getElementById('additionalInvestmentInputs');
    const frequencyGroup = document.getElementById('investmentFrequencyGroup');
    const helpIcon = document.getElementById('additionalInvestmentHelp');
    
    if (hasFLRPrice) {
        additionalInputs.classList.remove('disabled');
        frequencyGroup.classList.remove('disabled');
        helpIcon.classList.remove('visible');
        helpIcon.classList.add('hidden');
    } else {
        additionalInputs.classList.add('disabled');
        frequencyGroup.classList.add('disabled');
        helpIcon.classList.remove('hidden');
        helpIcon.classList.add('visible');
    }
}

function getAdditionalInvestment() {
    const amount = parseFloat(document.getElementById('investmentAmount').value) || 0;
    const frequency = parseInt(document.getElementById('investmentFrequency').value) || 0;
    const hasFLRPrice = currentFLRPrice !== null && currentFLRPrice > 0;
    
    if (!hasFLRPrice || amount <= 0 || frequency <= 0) {
        return { amountUSD: 0, amountFLR: 0, frequencyDays: 0 };
    }
    
    return {
        amountUSD: amount,
        amountFLR: amount / currentFLRPrice,
        frequencyDays: frequency
    };
}

function toggleCustomDays() {
    const claimFrequency = document.getElementById('claimFrequency').value;
    const customDaysInput = document.getElementById('customDays');
    const wrapper = customDaysInput.parentElement;
    
    if (claimFrequency === 'custom') {
        customDaysInput.style.display = 'block';
        customDaysInput.value = '30';
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

function calculateAndUpdateYield() {
    const activeBtn = document.querySelector('.ftso-toggle-btn.active');
    const ftsoCount = parseInt(activeBtn.getAttribute('data-count'));
    
    const ftso1Rate = parseFloat(document.getElementById('ftsoReward1').value) || 0;
    const ftso2Rate = parseFloat(document.getElementById('ftsoReward2').value) || 0;
    
    let calculatedYield = 0;
    
    if (ftsoCount === 1) {
        // Use FTSO 1 rate directly
        calculatedYield = ftso1Rate;
    } else if (ftsoCount === 2) {
        // Calculate weighted average based on slider ratio
        const sliderValue = parseFloat(document.getElementById('ftsoRatioSlider').value);
        const ftso1Ratio = (100 - sliderValue) / 100; // Left side of slider
        const ftso2Ratio = sliderValue / 100; // Right side of slider
        
        calculatedYield = (ftso1Ratio * ftso1Rate) + (ftso2Ratio * ftso2Rate);
    }
    
    // Apply 20% FTSO commission to the yield rate (net rate after commission)
    const netYield = calculatedYield * 0.8;
    
    // Update the yield input with net yield after commission
    document.getElementById('stakingYield').value = netYield.toFixed(8);
    
    console.log(`Calculated yield: ${netYield.toFixed(8)} FLR/day net after 20% FTSO commission (FTSO Count: ${ftsoCount}, Gross Rates: ${ftso1Rate}, ${ftso2Rate})`);
}

function adjustYield(increment) {
    // This function is no longer used since yield is auto-calculated
    // Kept for compatibility but does nothing
    return;
}

function updateAdditionalInvestment() {
    const amount = parseFloat(document.getElementById('investmentAmount').value) || 0;
    const frequency = parseInt(document.getElementById('investmentFrequency').value) || 0;
    // Additional validation can be added here
}

function calculateYield() {
    // Clear previous calculation globals
    window.calculationBreakdown = [];
    
    // Get input values
    const flrAmount = parseFloat(document.getElementById('flrAmount').value) || 0;
    const dailyYieldFLR = parseFloat(document.getElementById('stakingYield').value) || 0; // FLR per day
    const years = parseInt(document.getElementById('years').value) || 0;
    const months = parseInt(document.getElementById('months').value) || 0;
    
    console.log('FLR Calculation inputs:', { flrAmount, dailyYieldFLR, years, months });
    
    // Validate FLR amount
    if (flrAmount <= 0) {
        customAlert('Please enter a valid FLR amount');
        return;
    }
    
    // Get additional investment parameters
    const additionalInvestment = getAdditionalInvestment();
    
    // Get claim frequency
    const claimDays = getClaimFrequencyDays();
    
    console.log('Additional params:', { additionalInvestment, claimDays });
    
    // Handle edge cases: if time is 0, show current amount only
    if (years === 0 && months === 0) {
        let totalWithInvestments = flrAmount;
        if (additionalInvestment.frequencyDays > 0 && additionalInvestment.amountFLR > 0) {
            totalWithInvestments += additionalInvestment.amountFLR;
        }
        updateResults(flrAmount, totalWithInvestments - flrAmount, totalWithInvestments, 0, totalWithInvestments, 0);
        return;
    }
    
    // Calculate total time in days
    const totalDays = years * 365 + months * 30;
    
    // Special case: if daily yield is 0, handle additional investments only
    if (dailyYieldFLR === 0) {
        let totalAdditional = 0;
        if (additionalInvestment.frequencyDays > 0 && additionalInvestment.amountFLR > 0) {
            const totalInvestmentPeriods = Math.floor(totalDays / additionalInvestment.frequencyDays);
            totalAdditional = additionalInvestment.amountFLR * totalInvestmentPeriods;
        }
        
        const finalTotal = flrAmount + totalAdditional;
        updateResults(flrAmount, totalAdditional, finalTotal, 0, finalTotal, 0);
        return;
    }
    
    // FLR-specific calculation: Daily yield with periodic reinvestment
    let currentPrincipal = flrAmount;
    let totalStakingRewards = 0;
    let totalAdditionalInvestment = 0;
    let nextInvestmentDay = additionalInvestment.frequencyDays;
    let nextClaimDay = claimDays;
    let periodNumber = 1;
    let accumulatedRewards = 0;
    
    // Daily simulation for FLR yield with periodic reinvestment
    for (let day = 1; day <= totalDays; day++) {
        // Calculate daily rewards based on current principal (rate is per 3.5 days, so divide by 3.5 for daily rate)
        const dailyReward = currentPrincipal * (dailyYieldFLR / 3.5);
        accumulatedRewards += dailyReward;
        
        // Claim/Reinvest day - reinvest accumulated rewards back to principal
        if (day === nextClaimDay) {
            const initialAmountThisPeriod = currentPrincipal;
            
            // Add accumulated rewards to principal (reinvestment)
            currentPrincipal += accumulatedRewards;
            totalStakingRewards += accumulatedRewards;
            
            // Store period breakdown
            window.calculationBreakdown.push({
                period: periodNumber,
                initialAmount: initialAmountThisPeriod,
                stakingReward: accumulatedRewards,
                finalAmount: currentPrincipal
            });
            
            console.log(`Period ${periodNumber}: Principal ${initialAmountThisPeriod.toFixed(2)} + Rewards ${accumulatedRewards.toFixed(2)} = ${currentPrincipal.toFixed(2)}`);
            
            accumulatedRewards = 0;
            periodNumber++;
            nextClaimDay += claimDays;
        }
        
        // Additional investment day
        if (additionalInvestment.frequencyDays > 0 && day === nextInvestmentDay &&
            totalAdditionalInvestment < additionalInvestment.amountFLR * Math.floor(totalDays / additionalInvestment.frequencyDays)) {
            
            currentPrincipal += additionalInvestment.amountFLR;
            totalAdditionalInvestment += additionalInvestment.amountFLR;
            nextInvestmentDay += additionalInvestment.frequencyDays;
            
            console.log(`Day ${day}: Added investment ${additionalInvestment.amountFLR.toFixed(2)}, new principal: ${currentPrincipal.toFixed(2)}`);
        }
    }
    
    // Add any remaining accumulated rewards
    totalStakingRewards += accumulatedRewards;
    const finalTotal = currentPrincipal + accumulatedRewards;
    
    console.log('Final calculation:', {
        originalAmount: flrAmount,
        totalAdditionalInvestment,
        totalStakingRewards,
        finalTotal
    });
    
    // Calculate APY based on total return over time
    let stakingAPY = 0;
    if (totalDays > 0 && flrAmount > 0) {
        // APY = ((Final Amount / Initial Amount) ^ (365 / Days)) - 1) * 100
        const totalReturn = finalTotal / flrAmount;
        const annualizedReturn = Math.pow(totalReturn, 365 / totalDays);
        stakingAPY = (annualizedReturn - 1) * 100;
    }
    
    console.log('Calculated APY:', stakingAPY);
    
    // Update the display
    updateResults(flrAmount, totalAdditionalInvestment, flrAmount + totalAdditionalInvestment, totalStakingRewards, finalTotal, stakingAPY);
}

function updateResults(initial, additionalPrincipal, invested, rewards, total, stakingApy) {
    // Calculate additional investment per period
    const additionalInvestment = getAdditionalInvestment();
    const additionalPerPeriod = additionalInvestment.amountFLR;
    
    // Update FLR amounts
    document.getElementById('initialAmount').textContent = formatNumber(initial) + ' FLR';
    document.getElementById('additionalPerPeriod').textContent = formatNumber(additionalPerPeriod) + ' FLR';
    document.getElementById('additionalPrincipal').textContent = formatNumber(additionalPrincipal) + ' FLR';
    document.getElementById('investedAmount').textContent = formatNumber(invested) + ' FLR';
    document.getElementById('stakingRewards').textContent = formatNumber(rewards) + ' FLR';
    document.getElementById('totalAmount').textContent = formatNumber(total) + ' FLR';
    
    // Update APY values (only Total APY now)
    document.getElementById('totalApy').textContent = formatNumber(stakingApy, 2) + '%';
    
    // Update USD amounts if price is available
    const priceToUse = currentFLRPrice || 0;
    
    const usdUpdates = [
        { id: 'initialAmountUSD', value: initial * priceToUse },
        { id: 'additionalPerPeriodUSD', value: additionalPerPeriod * priceToUse },
        { id: 'additionalPrincipalUSD', value: additionalPrincipal * priceToUse },
        { id: 'investedAmountUSD', value: invested * priceToUse },
        { id: 'stakingRewardsUSD', value: rewards * priceToUse },
        { id: 'totalAmountUSD', value: total * priceToUse }
    ];
    
    usdUpdates.forEach(update => {
        const element = document.getElementById(update.id);
        if (element) {
            element.textContent = `($${formatNumber(update.value)})`;
            element.style.display = 'block';
            element.style.color = '#ce9178';
            element.style.fontSize = '0.65rem';
        }
    });
}

function formatNumber(num, decimals = 2) {
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

// FTSO Functions
function setFTSOCount(count) {
    // Update button states
    document.querySelectorAll('.ftso-toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-count="${count}"]`).classList.add('active');
    
    // Hide all FTSO modes
    document.getElementById('ftso1Mode').style.display = 'none';
    document.getElementById('ftso2Mode').style.display = 'none';
    
    // Show selected mode
    document.getElementById(`ftso${count}Mode`).style.display = 'block';
    
    // Update reward rate inputs visibility
    updateRewardRateInputs();
    
    // Initialize mode-specific settings
    if (count === 2) {
        updateFTSORatioDisplay();
    }
    
    // Update FTSO info displays based on current mode
    const rewardRateMode = document.getElementById('rewardRateMode');
    const currentMode = rewardRateMode && rewardRateMode.checked ? 'auto' : 'manual';
    updateFTSOInfoForMode(currentMode);
    
    console.log(`🎛️  Switched to ${count} FTSO mode`);
}

function updateFTSORatioDisplay() {
    const ratio = parseFloat(document.getElementById('ftsoRatioSlider').value);
    
    // Update percentage display - left side = FTSO 1, right side = FTSO 2
    const ftso1Percent = 100 - ratio;
    const ftso2Percent = ratio;
    
    // Update slider labels only
    document.getElementById('ftso1Ratio').textContent = ftso1Percent;
    document.getElementById('ftso2Ratio').textContent = ftso2Percent;
    
    // Recalculate yield when ratio changes
    calculateAndUpdateYield();
}

function validateFTSOPercentages() {
    // This function is no longer needed since we only support 1-2 FTSOs
    // Kept for compatibility but returns true
    return true;
}

// Reward Rate Functions
function setRewardRateMode(mode) {
    const manualRates = document.getElementById('manualRewardRates');
    const autoRates = document.getElementById('autoRewardRates');
    const input1 = document.getElementById('ftsoReward1');
    const input2 = document.getElementById('ftsoReward2');
    const indicator1 = document.getElementById('autoIndicator1');
    const indicator2 = document.getElementById('autoIndicator2');
    
    // Always show manual rates section, hide auto message section
    manualRates.style.display = 'block';
    autoRates.style.display = 'none';
    
    if (mode === 'manual') {
        // Manual mode - remove auto styling and click handlers
        manualRates.classList.remove('reward-rate-auto');
        if (input1) {
            input1.readOnly = false;
            input1.placeholder = '0.00';
            input1.style.cursor = 'text';
            input1.onclick = null;
        }
        if (input2) {
            input2.readOnly = false;
            input2.placeholder = '0.00';
            input2.style.cursor = 'text';
            input2.onclick = null;
        }
        
        // Update FTSO info displays for manual mode
        updateFTSOInfoForMode('manual');
        updateRewardRateInputs();
    } else if (mode === 'auto') {
        // Auto mode - add auto styling and make inputs clickable
        manualRates.classList.add('reward-rate-auto');
        if (input1) {
            input1.readOnly = true;
            input1.placeholder = 'Click here to select FTSO provider';
            input1.value = '';
            input1.style.cursor = 'pointer';
            input1.onclick = () => {
                console.log('Input 1 clicked in auto mode');
                toggleFTSODropdown(1);
            };
        }
        if (input2) {
            input2.readOnly = true;
            input2.placeholder = 'Click here to select FTSO provider';
            input2.value = '';
            input2.style.cursor = 'pointer';
            input2.onclick = () => {
                console.log('Input 2 clicked in auto mode');
                toggleFTSODropdown(2);
            };
        }
        
        // Update FTSO info displays for auto mode
        updateFTSOInfoForMode('auto');
        updateRewardRateInputs();
    }
}

// Helper function to update FTSO info based on mode
function updateFTSOInfoForMode(mode) {
    const activeBtn = document.querySelector('.ftso-toggle-btn.active');
    const ftsoCount = parseInt(activeBtn.getAttribute('data-count'));
    
    console.log(`🔄 Updating FTSO info for mode: ${mode}, count: ${ftsoCount}`);
    
    if (mode === 'manual') {
        // In manual mode, show "Manual" for active FTSOs - target correct elements based on mode
        if (ftsoCount === 1) {
            const infoElement = document.getElementById('ftso1Name_single');
            if (infoElement) {
                infoElement.textContent = 'Manual';
                infoElement.className = 'ftso-info-name provider-name';
                infoElement.title = 'Manual reward rate entry';
                console.log(`✅ Set single FTSO to Manual`);
            }
        } else if (ftsoCount === 2) {
            // Set both FTSOs to Manual in dual mode
            const ftso1Element = document.getElementById('ftso1Name_dual');
            const ftso2Element = document.getElementById('ftso2Name_dual');
            
            if (ftso1Element) {
                ftso1Element.textContent = 'Manual';
                ftso1Element.className = 'ftso-info-name provider-name';
                ftso1Element.title = 'Manual reward rate entry';
                console.log(`✅ Set dual FTSO 1 to Manual`);
            }
            if (ftso2Element) {
                ftso2Element.textContent = 'Manual';
                ftso2Element.className = 'ftso-info-name provider-name';
                ftso2Element.title = 'Manual reward rate entry';
                console.log(`✅ Set dual FTSO 2 to Manual`);
            }
        }
    } else if (mode === 'auto') {
        // In auto mode, clear all and show "Not selected" - target correct elements
        if (ftsoCount === 1) {
            const infoElement = document.getElementById('ftso1Name_single');
            if (infoElement) {
                infoElement.textContent = 'Not selected';
                infoElement.className = 'ftso-info-name not-selected';
                infoElement.title = '';
                console.log(`🔄 Reset single FTSO for auto mode`);
            }
        } else if (ftsoCount === 2) {
            const ftso1Element = document.getElementById('ftso1Name_dual');
            const ftso2Element = document.getElementById('ftso2Name_dual');
            
            if (ftso1Element) {
                ftso1Element.textContent = 'Not selected';
                ftso1Element.className = 'ftso-info-name not-selected';
                ftso1Element.title = '';
                console.log(`🔄 Reset dual FTSO 1 for auto mode`);
            }
            if (ftso2Element) {
                ftso2Element.textContent = 'Not selected';
                ftso2Element.className = 'ftso-info-name not-selected';
                ftso2Element.title = '';
                console.log(`🔄 Reset dual FTSO 2 for auto mode`);
            }
        }
    }
}

function updateRewardRateInputs() {
    const activeBtn = document.querySelector('.ftso-toggle-btn.active');
    const count = parseInt(activeBtn.getAttribute('data-count'));
    
    // Show/hide reward rate inputs based on FTSO count (only 1 and 2 FTSOs supported)
    const input1 = document.getElementById('rewardRate1');
    const input2 = document.getElementById('rewardRate2');
    
    // Reset all inputs
    if (input1) input1.style.display = 'none';
    if (input2) input2.style.display = 'none';
    
    // Show inputs based on FTSO count
    if (count >= 1 && input1) input1.style.display = 'block';
    if (count >= 2 && input2) input2.style.display = 'block';
    
    console.log(`Updated reward rate inputs for ${count} FTSOs - input1: ${input1 ? 'found' : 'not found'}, input2: ${input2 ? 'found' : 'not found'}`);
}

async function checkFlareAPIAvailability() {
    try {
        // Use CORS proxy to bypass browser restrictions
        const corsProxy = 'https://corsproxy.io/?';
        const flareApiUrl = 'https://flare-systems-explorer-backend.flare.network/api/v0/entity?format=json&limit=5&offset=0';
        const proxyUrl = corsProxy + encodeURIComponent(flareApiUrl);
        
        console.log('Testing Flare API via CORS proxy:', proxyUrl);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Flare API data retrieved successfully:', data);
            
            // Strict validation - must have proper Flare API structure with real FTSO data
            if (data &&
                data.results &&
                Array.isArray(data.results) &&
                data.results.length >= 5 && // Should have at least 5 providers
                (data.count || data.totalCount) &&
                typeof (data.count || data.totalCount) === 'number' &&
                (data.count || data.totalCount) > 0) {
                
                // Validate that we have multiple valid FTSO providers with actual reward rates
                const validProviders = data.results.filter(provider =>
                    provider.id &&
                    provider.identity_address &&
                    provider.identity_address.startsWith('0x') &&
                    provider.identity_address.length === 42 &&
                    provider.entityrewardslatest &&
                    typeof provider.entityrewardslatest.reward_rate_wnat === 'number' &&
                    provider.entityrewardslatest.reward_rate_wnat > 0
                );
                
                console.log('Flare API strict validation result:', {
                    hasResults: true,
                    resultCount: data.results.length,
                    totalCount: data.count || data.totalCount,
                    validProviderCount: validProviders.length,
                    hasValidProviders: validProviders.length >= 3, // Need at least 3 valid providers
                    firstValidProvider: validProviders[0] || null
                });
                
                return validProviders.length >= 3; // Require at least 3 valid FTSO providers
            }
            
            console.log('Flare API validation failed - insufficient or invalid data structure:', {
                hasData: !!data,
                hasResults: !!(data && data.results),
                isArray: !!(data && data.results && Array.isArray(data.results)),
                resultCount: data && data.results ? data.results.length : 0,
                hasTotalCount: !!(data && (data.count || data.totalCount)),
                totalCount: data ? (data.count || data.totalCount) : null
            });
            return false;
        }
        
        console.log('Flare API response not ok:', response.status, response.statusText);
        return false;
    } catch (error) {
        console.error('Error accessing Flare API:', error.name, error.message);
        return false;
    }
}

function toggleRewardRateMode() {
    const isAutoMode = document.getElementById('rewardRateMode').checked;
    
    console.log('Toggling reward rate mode to:', isAutoMode ? 'auto' : 'manual');
    
    if (isAutoMode) {
        setRewardRateMode('auto');
        // Load FTSO providers when switching to auto mode
        console.log('Loading FTSO providers...');
        loadFTSOProviders();
    } else {
        setRewardRateMode('manual');
    }
}

// FTSO Provider Management
let ftsoProviders = [];
let filteredProviders = [];

async function loadFTSOProviders() {
    try {
        console.log('Starting to load FTSO providers...');
        const corsProxy = 'https://corsproxy.io/?';
        const flareApiUrl = 'https://flare-systems-explorer-backend.flare.network/api/v0/entity?format=json&limit=200&offset=0';
        const proxyUrl = corsProxy + encodeURIComponent(flareApiUrl);
        
        console.log('Fetching from:', proxyUrl);
        const response = await fetch(proxyUrl);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Raw API response:', data);
            
            if (data && data.results) {
                ftsoProviders = data.results.map(provider => ({
                    id: provider.id,
                    name: provider.display_name || provider.identity_address || 'Unknown',
                    displayName: provider.display_name || null,
                    identityAddress: provider.identity_address || 'Unknown',
                    delegationAddress: provider.denormalizedentity?.delegation_address ||
                                     provider.denormalizedsigningpolicy?.delegation_address ||
                                     provider.identity_address || 'Unknown',
                    address: provider.identity_address || 'Unknown', // Keep for backward compatibility
                    rewardRate: provider.entityrewardslatest?.reward_rate_wnat || 0,
                    disabled: !provider.entityrewardslatest?.reward_rate_wnat || provider.entityrewardslatest.reward_rate_wnat === 0
                }));
                
                // Sort providers: 1) Named providers (enabled), 2) Address-only providers (enabled), 3) Disabled
                ftsoProviders.sort((a, b) => {
                    // First, separate by disabled status
                    if (a.disabled && !b.disabled) return 1;
                    if (!a.disabled && b.disabled) return -1;
                    
                    // For enabled providers, prioritize those with display names
                    if (!a.disabled && !b.disabled) {
                        const aHasName = !!a.displayName;
                        const bHasName = !!b.displayName;
                        
                        if (aHasName && !bHasName) return -1;
                        if (!aHasName && bHasName) return 1;
                        
                        // Within same category, sort by reward rate descending
                        return b.rewardRate - a.rewardRate;
                    }
                    
                    // For disabled providers, sort by reward rate descending
                    return b.rewardRate - a.rewardRate;
                });
                
                console.log('Processed FTSO providers:', ftsoProviders.length, ftsoProviders);
                populateFTSODropdowns();
            } else {
                console.error('No results in API response');
            }
        } else {
            console.error('API response not ok:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('Error loading FTSO providers:', error);
    }
}

function populateFTSODropdowns() {
    console.log('Populating FTSO dropdowns with', ftsoProviders.length, 'providers');
    populateFTSODropdown(1);
    populateFTSODropdown(2);
}

function populateFTSODropdown(dropdownId) {
    const dropdownList = document.getElementById(`ftsoList${dropdownId}`);
    console.log(`Populating dropdown ${dropdownId}, element found:`, !!dropdownList);
    
    if (!dropdownList) return;
    
    dropdownList.innerHTML = '';
    
    ftsoProviders.forEach(provider => {
        const item = document.createElement('div');
        item.className = `dropdown-item ${provider.disabled ? 'disabled' : ''}`;
        
        if (!provider.disabled) {
            item.onclick = () => selectFTSOProvider(dropdownId, provider);
        }
        
        item.innerHTML = `
            <span class="provider-name" title="${provider.name}">${provider.name}</span>
            <span class="provider-rate">${provider.rewardRate.toFixed(8)}</span>
        `;
        
        dropdownList.appendChild(item);
    });
    
    console.log(`Populated dropdown ${dropdownId} with ${ftsoProviders.length} items`);
    
    // Initialize filtered providers
    filteredProviders = [...ftsoProviders];
}

function toggleFTSODropdown(dropdownId) {
    console.log('🔥 Toggle FTSO dropdown called for:', dropdownId);
    
    const dropdown = document.getElementById(`ftsoDropdown${dropdownId}`);
    
    console.log('🔍 Dropdown element found:', !!dropdown, dropdown);
    
    // Close all other dropdowns first
    [1, 2].forEach(id => {
        if (id !== dropdownId) {
            const otherDropdown = document.getElementById(`ftsoDropdown${id}`);
            if (otherDropdown) {
                otherDropdown.classList.remove('show');
            }
        }
    });
    
    // Toggle current dropdown
    if (dropdown) {
        const isShowing = dropdown.classList.contains('show');
        console.log('📋 Current dropdown showing status:', isShowing);
        
        if (isShowing) {
            dropdown.classList.remove('show');
            console.log('❌ Dropdown closed');
        } else {
            dropdown.classList.add('show');
            console.log('✅ Dropdown opened');
            
            // Focus search input
            const searchInput = dropdown.querySelector('.dropdown-search input');
            if (searchInput) {
                setTimeout(() => searchInput.focus(), 100);
            }
        }
    } else {
        console.error('💥 Dropdown element not found!');
    }
}

function filterFTSOProviders(dropdownId, searchTerm) {
    const dropdownList = document.getElementById(`ftsoList${dropdownId}`);
    if (!dropdownList) return;
    
    const term = searchTerm.toLowerCase();
    
    // Filter providers based on search term
    const filtered = ftsoProviders.filter(provider =>
        provider.name.toLowerCase().includes(term)
    );
    
    dropdownList.innerHTML = '';
    
    filtered.forEach(provider => {
        const item = document.createElement('div');
        item.className = `dropdown-item ${provider.disabled ? 'disabled' : ''}`;
        
        if (!provider.disabled) {
            item.onclick = () => selectFTSOProvider(dropdownId, provider);
        }
        
        // Highlight search term
        const highlightedName = provider.name.replace(
            new RegExp(term, 'gi'),
            match => `<mark style="background: rgba(86, 156, 214, 0.3); color: inherit;">${match}</mark>`
        );
        
        item.innerHTML = `
            <span class="provider-name" title="${provider.name}">${highlightedName}</span>
            <span class="provider-rate">${provider.rewardRate.toFixed(8)}</span>
        `;
        
        dropdownList.appendChild(item);
    });
    
    // Show "No results" if no matches
    if (filtered.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'dropdown-item disabled';
        noResults.innerHTML = '<span class="provider-name">No providers found</span>';
        dropdownList.appendChild(noResults);
    }
}

function selectFTSOProvider(dropdownId, provider) {
    // Set the reward rate
    const input = document.getElementById(`ftsoReward${dropdownId}`);
    if (input) {
        // Use the actual reward_rate_wnat value from the API
        input.value = provider.rewardRate.toFixed(8);
        
        // Update FTSO info display
        updateFTSOInfoDisplay(dropdownId, provider);
        
        // Recalculate yield when reward rate changes
        calculateAndUpdateYield();
    }
    
    // Close dropdown
    const dropdown = document.getElementById(`ftsoDropdown${dropdownId}`);
    if (dropdown) dropdown.classList.remove('show');
    
    console.log(`Selected FTSO provider for input ${dropdownId}:`, provider);
}

// Helper function to update FTSO info display
function updateFTSOInfoDisplay(ftsoNumber, provider = null) {
    // Determine which mode we're in to target the correct element
    const activeBtn = document.querySelector('.ftso-toggle-btn.active');
    const ftsoCount = parseInt(activeBtn.getAttribute('data-count'));
    
    let infoElement;
    if (ftsoCount === 1 && ftsoNumber === 1) {
        infoElement = document.getElementById('ftso1Name_single');
    } else if (ftsoCount === 2) {
        if (ftsoNumber === 1) {
            infoElement = document.getElementById('ftso1Name_dual');
        } else if (ftsoNumber === 2) {
            infoElement = document.getElementById('ftso2Name_dual');
        }
    }
    
    if (!infoElement) {
        console.log(`❌ FTSO info element not found for FTSO ${ftsoNumber} in ${ftsoCount} FTSO mode`);
        return;
    }
    
    if (!provider) {
        // Clear selection
        infoElement.textContent = 'Not selected';
        infoElement.className = 'ftso-info-name not-selected';
        return;
    }
    
    console.log(`🎯 Updating FTSO ${ftsoNumber} display with provider:`, provider);
    
    // Display provider name or abbreviated address
    let displayText = '';
    let className = 'ftso-info-name';
    
    // Prioritize display_name, then name, then abbreviated address
    if (provider.displayName && provider.displayName.trim() !== '') {
        displayText = provider.displayName;
        className += ' provider-name';
        console.log(`✅ Using displayName: "${displayText}"`);
    } else if (provider.name && provider.name.trim() !== '' &&
              !provider.name.startsWith('0x') && provider.name !== provider.address) {
        displayText = provider.name;
        className += ' provider-name';
        console.log(`✅ Using name: "${displayText}"`);
    } else if (provider.address && provider.address.startsWith('0x') && provider.address.length === 42) {
        // Abbreviate address as 0x<6numbers>...
        displayText = `0x${provider.address.slice(2, 8)}...`;
        className += ' address-short';
        console.log(`⚠️  Using abbreviated address: "${displayText}"`);
    } else {
        // Fallback
        displayText = provider.name || provider.address || 'Unknown';
        className += ' address-short';
        console.log(`⚠️  Using fallback: "${displayText}"`);
    }
    
    infoElement.textContent = displayText;
    infoElement.className = className;
    infoElement.title = `Identity: ${provider.identityAddress || provider.address}\nDelegation: ${provider.delegationAddress || provider.address}`;
    
    console.log(`📋 Final FTSO ${ftsoNumber} display: "${displayText}" (${className})`);
    console.log(`📋 Addresses - Identity: ${provider.identityAddress || provider.address}, Delegation: ${provider.delegationAddress || provider.address}`);
}

// Helper function to clear all FTSO info displays
function clearFTSOInfoDisplays() {
    [1, 2].forEach(num => {
        updateFTSOInfoDisplay(num, null);
    });
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
    console.log('🖱️ Document click detected:', event.target);
    
    // Check if click is on FTSO input field in auto mode
    const clickedInput = event.target.closest('#ftsoReward1, #ftsoReward2');
    if (clickedInput && clickedInput.readOnly) {
        console.log('🎯 Clicked on auto mode input:', clickedInput.id);
        // Input click is handled by the onclick handler, don't close dropdowns
        return;
    }
    
    const isDropdownClick = event.target.closest('.ftso-dropdown');
    
    if (!isDropdownClick) {
        console.log('👆 Click outside dropdown, closing all');
        [1, 2].forEach(id => {
            const dropdown = document.getElementById(`ftsoDropdown${id}`);
            if (dropdown) dropdown.classList.remove('show');
        });
    }
});

function getFTSOConfiguration() {
    // Determine active FTSO mode
    const activeBtn = document.querySelector('.ftso-toggle-btn.active');
    const count = parseInt(activeBtn.getAttribute('data-count'));
    
    switch (count) {
        case 1:
            return {
                count: 1,
                providers: [{
                    percentage: 100
                }]
            };
            
        case 2:
            const ratio = parseFloat(document.getElementById('ftsoRatioSlider').value);
            const ftso1Percent = 100 - ratio;
            const ftso2Percent = ratio;
            
            return {
                count: 2,
                providers: [
                    {
                        percentage: ftso1Percent
                    },
                    {
                        percentage: ftso2Percent
                    }
                ]
            };
            
        // 3 FTSO mode removed - only 1 and 2 FTSOs supported
            
        default:
            return null;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Fetch FLR price
    getFLRPrice();
    
    // Refresh price every 60 seconds
    setInterval(getFLRPrice, 60000);
    
    // Initialize additional investment functionality
    updateAdditionalInvestmentState();
    
    // Initialize claim frequency layout
    toggleCustomDays();
    
    // Initialize FTSO functionality
    setFTSOCount(1); // Default to 1 FTSO mode
    updateFTSORatioDisplay(); // Initialize 2 FTSO slider
    
    // Check Flare API availability and setup both address input and reward rate functionality
    const apiStatus = document.getElementById('flareApiStatus');
    const rewardRateToggle = document.getElementById('rewardRateMode');
    const autoModeLabel = document.getElementById('autoModeLabel');
    
    // Set initial checking status for both areas
    updateAddressInputStatus(false); // Start with offline until confirmed
    rewardRateToggle.disabled = true;
    apiStatus.textContent = 'Checking Flare API...';
    apiStatus.className = 'connection-status';
    
    // Check Flare API availability using CORS proxy
    setTimeout(async () => {
        try {
            console.log('Testing Flare API availability...');
            const apiAvailable = await checkFlareAPIAvailability();
            console.log('Flare API check result:', apiAvailable);
            
            // Update both address input status and FTSO status based on API availability
            updateAddressInputStatus(apiAvailable);
            
            if (apiAvailable) {
                rewardRateToggle.disabled = false;
                if (autoModeLabel) {
                    autoModeLabel.style.opacity = '1';
                    autoModeLabel.title = 'Auto mode enabled - Flare API accessible via CORS proxy';
                }
                apiStatus.textContent = 'Flare API connected - Auto mode enabled';
                apiStatus.className = 'connection-status online';
            } else {
                rewardRateToggle.disabled = true;
                rewardRateToggle.checked = false;
                if (autoModeLabel) {
                    autoModeLabel.style.opacity = '0.5';
                    autoModeLabel.title = 'Auto mode disabled - Unable to connect to Flare API';
                }
                apiStatus.textContent = 'Flare API unavailable - Manual mode only';
                apiStatus.className = 'connection-status offline';
            }
        } catch (error) {
            console.error('Error checking Flare API:', error);
            
            // Update both statuses for error case
            updateAddressInputStatus(false);
            rewardRateToggle.disabled = true;
            rewardRateToggle.checked = false;
            if (autoModeLabel) {
                autoModeLabel.style.opacity = '0.5';
                autoModeLabel.title = 'Auto mode disabled - Error checking Flare API';
            }
            apiStatus.textContent = 'Error connecting to API - Manual mode only';
            apiStatus.className = 'connection-status offline';
        }
    }, 500);
    
    // Initialize reward rate mode
    setRewardRateMode('manual');
    
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

// Modal Functions
function showCalculationsModal() {
    // Check if calculation breakdown exists
    if (!window.calculationBreakdown || window.calculationBreakdown.length === 0) {
        customAlert('Please run a calculation first to see the breakdown.');
        return;
    }
    
    generateCalculationsTable();
    document.getElementById('calculationsModal').style.display = 'block';
}

function showGraphModal() {
    // Check if calculation breakdown exists
    if (!window.calculationBreakdown || window.calculationBreakdown.length === 0) {
        customAlert('Please run a calculation first to see the graph.');
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
    
    if (!window.calculationBreakdown || window.calculationBreakdown.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--muted);">No calculation data available.</p>';
        return;
    }
    
    // Get calculation parameters for display
    const flrAmount = parseFloat(document.getElementById('flrAmount').value) || 0;
    const dailyYield = parseFloat(document.getElementById('stakingYield').value) || 0;
    const claimDays = getClaimFrequencyDays();
    const additionalInvestment = getAdditionalInvestment();
    
    let html = `
        <div style="margin-bottom: 18px;">
            <h3 style="color: var(--keyword); margin-bottom: 10px;">Calculation Parameters</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 0.75rem;">
                <div><strong>Initial Amount:</strong> ${formatNumber(flrAmount)} FLR</div>
                <div><strong>Yield Rate:</strong> ${formatNumber(dailyYield, 8)} FLR/3.5days per FLR</div>
                <div><strong>Claim/Reinvest Every:</strong> ${claimDays} days</div>
                ${additionalInvestment.amountFLR > 0 ? `<div><strong>Additional Investment:</strong> ${formatNumber(additionalInvestment.amountFLR)} FLR every ${additionalInvestment.frequencyDays} days</div>` : ''}
            </div>
        </div>
        
        <table class="calculations-table">
            <thead>
                <tr>
                    <th>Period</th>
                    <th>Initial Amount</th>
                    <th>Staking Rewards</th>
                    <th>Amount After Reinvestment</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Add period rows
    window.calculationBreakdown.forEach(period => {
        html += `
            <tr>
                <td class="period-number">Period ${period.period}</td>
                <td class="amount-value">${formatNumber(period.initialAmount)} FLR</td>
                <td class="amount-value">${formatNumber(period.stakingReward)} FLR</td>
                <td class="amount-value">${formatNumber(period.finalAmount)} FLR</td>
            </tr>
        `;
    });
    
    // Calculate totals
    const totalInitial = window.calculationBreakdown.reduce((sum, period) => sum + period.initialAmount, 0);
    const totalRewards = window.calculationBreakdown.reduce((sum, period) => sum + period.stakingReward, 0);
    const finalAmount = window.calculationBreakdown[window.calculationBreakdown.length - 1]?.finalAmount || 0;
    
    // Add totals row
    html += `
            <tr class="total-row">
                <td><strong>Total</strong></td>
                <td class="amount-value"><strong>${formatNumber(totalInitial)} FLR</strong></td>
                <td class="amount-value"><strong>${formatNumber(totalRewards)} FLR</strong></td>
                <td class="amount-value"><strong>${formatNumber(finalAmount)} FLR</strong></td>
            </tr>
            </tbody>
        </table>
    `;
    
    // Add note about FLR yield methodology
    html += `
        <div class="note" style="margin-top: 18px;">
            <strong>FLR Staking Methodology:</strong><br>
            • Daily rewards are calculated as: Current FLR Amount × ${formatNumber(dailyYield, 8)} FLR/3.5days per FLR ÷ 3.5 (net rate after 20% FTSO commission)<br>
            • Rewards accumulate over each ${claimDays}-day period, then are claimed and reinvested (added to principal)<br>
            • This compound growth continues for the full duration, with rewards growing as principal increases<br>
            • Additional investments are added to the principal on their respective schedules
        </div>
    `;
    
    container.innerHTML = html;
}

function generateChart() {
    const canvas = document.getElementById('growthChart');
    const ctx = canvas.getContext('2d');
    
    if (!window.calculationBreakdown || window.calculationBreakdown.length === 0) {
        return;
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get data from calculation breakdown first to calculate margins
    const flrAmount = parseFloat(document.getElementById('flrAmount').value) || 0;
    const periods = window.calculationBreakdown;
    const maxAmount = Math.max(...periods.map(p => p.finalAmount));
    const minAmount = Math.min(flrAmount, ...periods.map(p => p.initialAmount));
    
    // Calculate dynamic left margin based on y-axis label width
    ctx.font = '10px JetBrains Mono';
    let maxLabelWidth = 0;
    
    // Check width needed for all y-axis labels
    for (let i = 0; i <= 5; i++) {
        const value = minAmount + (maxAmount - minAmount) * (i / 5);
        const labelText = formatNumber(value) + ' FLR';
        const labelWidth = ctx.measureText(labelText).width;
        maxLabelWidth = Math.max(maxLabelWidth, labelWidth);
    }
    
    // Calculate dynamic margin: base margin + label width + padding for y-axis title
    const baseLabelMargin = 10; // Space between labels and y-axis line
    const yAxisTitleWidth = 80; // Approximate width needed for y-axis title
    const dynamicLeftMargin = Math.max(120, maxLabelWidth + baseLabelMargin + yAxisTitleWidth);
    
    // Chart dimensions and margins - use dynamic left margin
    const margin = { top: 40, right: 60, bottom: 60, left: dynamicLeftMargin };
    const chartWidth = canvas.width - margin.left - margin.right;
    const chartHeight = canvas.height - margin.top - margin.bottom;
    
    // Scale functions
    const xScale = (period) => margin.left + (period / periods.length) * chartWidth;
    const yScale = (amount) => margin.top + (1 - (amount - minAmount) / (maxAmount - minAmount)) * chartHeight;
    
    // Calculate smart label spacing for x-axis
    const maxLabels = 10; // Maximum number of x-axis labels to show
    const labelStep = Math.max(1, Math.ceil(periods.length / maxLabels));
    
    // Set canvas styles
    ctx.fillStyle = '#e9f0ff';
    ctx.font = '12px JetBrains Mono';
    ctx.textAlign = 'center';
    
    // Draw title
    ctx.font = 'bold 16px JetBrains Mono';
    ctx.fillText('FLR Balance Growth Over Time', canvas.width / 2, 25);
    
    // Draw grid lines and labels
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.font = '10px JetBrains Mono';
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
        
        // Label
        ctx.textAlign = 'right';
        ctx.fillText(formatNumber(value) + ' FLR', margin.left - 10, y + 4);
    }
    
    // X-axis labels and grid - use smart spacing
    ctx.textAlign = 'center';
    for (let i = 0; i <= periods.length; i++) {
        const x = xScale(i);
        
        // Always draw grid lines
        ctx.beginPath();
        ctx.moveTo(x, margin.top);
        ctx.lineTo(x, margin.top + chartHeight);
        ctx.stroke();
        
        // Only show labels at smart intervals to prevent clustering
        if (i % labelStep === 0 || i === 0 || i === periods.length) {
            ctx.fillText(`P${i}`, x, margin.top + chartHeight + 20);
        }
    }
    
    // Draw area chart for staking growth
    ctx.fillStyle = 'rgba(82, 210, 115, 0.2)';
    ctx.strokeStyle = '#52d273';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(xScale(0), yScale(flrAmount));
    
    // Draw the growth line
    periods.forEach((period, index) => {
        ctx.lineTo(xScale(index + 1), yScale(period.finalAmount));
    });
    
    // Close the area
    ctx.lineTo(xScale(periods.length), margin.top + chartHeight);
    ctx.lineTo(xScale(0), margin.top + chartHeight);
    ctx.closePath();
    ctx.fill();
    
    // Draw the line
    ctx.beginPath();
    ctx.moveTo(xScale(0), yScale(flrAmount));
    periods.forEach((period, index) => {
        ctx.lineTo(xScale(index + 1), yScale(period.finalAmount));
    });
    ctx.stroke();
    
    // Draw data points
    ctx.fillStyle = '#52d273';
    periods.forEach((period, index) => {
        const x = xScale(index + 1);
        const y = yScale(period.finalAmount);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
    });
    
    // Initial point
    ctx.beginPath();
    ctx.arc(xScale(0), yScale(flrAmount), 4, 0, 2 * Math.PI);
    ctx.fill();
    
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
    ctx.font = '12px JetBrains Mono';
    ctx.textAlign = 'center';
    
    // X-axis label
    ctx.save();
    ctx.translate(margin.left + chartWidth / 2, canvas.height - 10);
    ctx.fillText('Reinvestment Periods', 0, 0);
    ctx.restore();
    
    // Y-axis label
    ctx.save();
    ctx.translate(35, margin.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('FLR Balance', 0, 0);
    ctx.restore();
    
    // Update legend
    const legendEl = document.getElementById('chartLegend');
    const totalGrowth = ((periods[periods.length - 1]?.finalAmount || flrAmount) / flrAmount - 1) * 100;
    const claimDays = getClaimFrequencyDays();
    
    legendEl.innerHTML = `
        <div style="display: inline-flex; align-items: center; gap: 20px;">
            <div style="display: flex; align-items: center; gap: 5px;">
                <div style="width: 12px; height: 12px; background: #52d273; border-radius: 2px;"></div>
                <span>FLR Balance Growth</span>
            </div>
            <div style="color: var(--muted);">
                Reinvestment every ${claimDays} days • Total Growth: ${totalGrowth.toFixed(1)}%
            </div>
        </div>
    `;
}