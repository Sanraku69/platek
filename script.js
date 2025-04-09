document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const totalMemoryInput = document.getElementById('totalMemory');
    const numJobsInput = document.getElementById('numJobs');
    const generateTableBtn = document.getElementById('generateTableBtn');
    const jobTableBody = document.querySelector('#jobTable tbody');
    const startSimulationBtn = document.getElementById('startSimulation');
    const resetSimulationBtn = document.getElementById('resetSimulation');
    const timerElement = document.getElementById('timer');
    const memoryVisualizationElement = document.getElementById('memoryVisualization');
    const memoryTotalElement = document.getElementById('memoryTotal');
    const memoryUsedElement = document.getElementById('memoryUsed');
    const memoryFreeElement = document.getElementById('memoryFree');
    const eventLogElement = document.getElementById('eventLog');
    const numberOfJobs = 5;
    
    // Constants
    const OS_KERNEL_SIZE = 10; // KB
    const COLOR_PALETTE = [
        '#3498db', '#9b59b6', '#e67e22', '#2ecc71', '#1abc9c',
        '#f1c40f', '#e74c3c', '#34495e', '#16a085', '#27ae60',
        '#2980b9', '#8e44ad', '#f39c12', '#d35400', '#c0392b'
    ];
    
    // State variables
    let jobs = [];
    let memorySlots = [];
    let totalMemory = 0;
    let timer = null;
    let currentTime = 0;
    let simulationRunning = false;
    
    // Initialize the application
    function init() {
        generateTableBtn.addEventListener('click', generateJobTable);
        startSimulationBtn.addEventListener('click', startSimulation);
        resetSimulationBtn.addEventListener('click', resetSimulation);
        
        // Set minimum total memory to account for OS kernel
        totalMemoryInput.min = OS_KERNEL_SIZE + 10;
        
        // Update memory stats initially
        updateMemoryStats();
    }
    
    // Generate the job table based on user input
    function generateJobTable() {
        const numJobs = parseInt(numJobsInput.value);
        totalMemory = parseInt(totalMemoryInput.value);
        
        if (numJobs <= 0 || totalMemory < OS_KERNEL_SIZE + 10) {
            alert('Please enter valid values. Number of jobs must be positive and total memory must be at least ' + (OS_KERNEL_SIZE + 10) + ' KB.');
            return;
        }
        
        // Initialize jobs array
        jobs = [];
        for (let i = 0; i < numJobs; i++) {
            jobs.push({
                id: 'Job-' + (i + 1),
                size: Math.floor(Math.random() * 20) + 5, // Random size between 5-24 KB
                loadingTime: Math.floor(Math.random() * 500) + 100, // Random loading time between 100-599 ms
                finishTime: Math.floor(Math.random() * 2000) + 1000, // Random finish time between 1000-2999 ms
                status: 'waiting', // waiting, loading, running, finished
                position: -1, // position in memory (-1 means not in memory)
                color: COLOR_PALETTE[i % COLOR_PALETTE.length]
            });
        }
        
        // Render the job table
        renderJobTable();
        
        // Initialize memory visualization
        initMemoryVisualization();
        
        // Enable start button
        startSimulationBtn.disabled = false;
        resetSimulationBtn.disabled = false;
        
        // Update memory stats
        updateMemoryStats();
        
        // Log event
        logEvent('System initialized with ' + totalMemory + ' KB memory and ' + numJobs + ' jobs');
    }
    
    // Render the job table
    function renderJobTable() {
        jobTableBody.innerHTML = '';
        
        jobs.forEach((job, index) => {
            const row = document.createElement('tr');
            
            // Job ID (not editable)
            const idCell = document.createElement('td');
            idCell.textContent = job.id;
            row.appendChild(idCell);
            
            // Job Size (editable)
            const sizeCell = document.createElement('td');
            sizeCell.textContent = job.size;
            sizeCell.classList.add('editable');
            sizeCell.dataset.field = 'size';
            sizeCell.dataset.index = index;
            sizeCell.addEventListener('click', editCell);
            row.appendChild(sizeCell);
            
            // Loading Time (editable)
            const loadingTimeCell = document.createElement('td');
            loadingTimeCell.textContent = job.loadingTime;
            loadingTimeCell.classList.add('editable');
            loadingTimeCell.dataset.field = 'loadingTime';
            loadingTimeCell.dataset.index = index;
            loadingTimeCell.addEventListener('click', editCell);
            row.appendChild(loadingTimeCell);
            
            // Finish Time (editable)
            const finishTimeCell = document.createElement('td');
            finishTimeCell.textContent = job.finishTime;
            finishTimeCell.classList.add('editable');
            finishTimeCell.dataset.field = 'finishTime';
            finishTimeCell.dataset.index = index;
            finishTimeCell.addEventListener('click', editCell);
            row.appendChild(finishTimeCell);
            
            jobTableBody.appendChild(row);
        });
    }
    
    // Make a cell editable
    function editCell(event) {
        if (simulationRunning) return; // Prevent editing during simulation
        
        const cell = event.target;
        const field = cell.dataset.field;
        const index = parseInt(cell.dataset.index);
        
        const input = document.createElement('input');
        input.type = 'number';
        input.min = field === 'size' ? 1 : 0;
        input.value = cell.textContent;
        input.style.width = '100%';
        
        // Replace cell content with input
        cell.textContent = '';
        cell.appendChild(input);
        input.focus();
        
        // Handle input blur
        input.addEventListener('blur', function() {
            const value = parseInt(input.value);
            if (isNaN(value) || value < (field === 'size' ? 1 : 0)) {
                alert('Please enter a valid value');
                input.focus();
                return;
            }
            
            // Update job data
            jobs[index][field] = value;
            
            // Update cell content
            cell.textContent = value;
            
            // Add editable event listener again
            cell.addEventListener('click', editCell);
        });
        
        // Handle Enter key
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                input.blur();
            }
        });
        
        // Remove click event temporarily
        cell.removeEventListener('click', editCell);
    }
    
    // Initialize memory visualization
    function initMemoryVisualization() {
        memoryVisualizationElement.innerHTML = '';
        
        // Create OS kernel slot
        const osKernelSlot = document.createElement('div');
        osKernelSlot.classList.add('memory-slot', 'os-kernel');
        osKernelSlot.style.height = `${(OS_KERNEL_SIZE / 100) * 500}px`; // 100KB = 500px
        osKernelSlot.textContent = 'OS Kernel';
        memoryVisualizationElement.appendChild(osKernelSlot);
        
        // Create free space slot
        const freeSpaceSlot = document.createElement('div');
        freeSpaceSlot.classList.add('memory-slot', 'free-space');
        freeSpaceSlot.style.height = `${((totalMemory - OS_KERNEL_SIZE) / 100) * 500}px`;
        freeSpaceSlot.textContent = 'Free Space';
        memoryVisualizationElement.appendChild(freeSpaceSlot);
        
        // Initialize memory slots
        memorySlots = [
            { type: 'os', size: OS_KERNEL_SIZE, jobId: null },
            { type: 'free', size: totalMemory - OS_KERNEL_SIZE, jobId: null }
        ];
    }

    
// Update memory visualization
    function updateMemoryVisualization() {
        memoryVisualizationElement.innerHTML = '';
        
        memorySlots.forEach(slot => {
            const slotElement = document.createElement('div');
            slotElement.classList.add('memory-slot');
            
            // Calculate height as a function of memory size (1KB = 5px)
            const heightInPixels = (slot.size / 100) * 500; // 100KB = 500px
            
            slotElement.style.height = `${heightInPixels}px`; // Set height of the slot
            slotElement.style.width = `100%`; // Full width of the container

            if (slot.type === 'os') {
                slotElement.classList.add('os-kernel');
                slotElement.textContent = 'OS Kernel';
            } else if (slot.type === 'job') {
                const job = jobs.find(j => j.id === slot.jobId);
                slotElement.classList.add('job');
                slotElement.style.backgroundColor = job.color;
                slotElement.textContent = `${job.id} (${slot.size}KB)`;
            } else {
                slotElement.classList.add('free-space');
                slotElement.textContent = `Free (${slot.size}KB)`;
            }
            
            memoryVisualizationElement.appendChild(slotElement);
        });
    }
    
    generateTableBtn.addEventListener('click', () => {
        // Clear the existing table rows
        jobTableBody.innerHTML = '';
        
        // Generate table rows for each job
        for (let i = 1; i <= numberOfJobs; i++) {
            const row = document.createElement('tr');
            
            // Create the Job ID cell
            const jobIdCell = document.createElement('td');
            jobIdCell.textContent = `Job ${i}`;
            
            // Create the Job Size input field
            const jobSizeCell = document.createElement('td');
            const jobSizeInput = document.createElement('input');
            jobSizeInput.type = 'number';
            jobSizeInput.placeholder = 'Enter size';
            jobSizeCell.appendChild(jobSizeInput);
    
            // Create the Loading Time input field
            const loadingTimeCell = document.createElement('td');
            const loadingTimeInput = document.createElement('input');
            loadingTimeInput.type = 'number';
            loadingTimeInput.placeholder = 'Enter loading time';
            loadingTimeCell.appendChild(loadingTimeInput);
    
            // Create the Finish Time input field
            const finishTimeCell = document.createElement('td');
            const finishTimeInput = document.createElement('input');
            finishTimeInput.type = 'number';
            finishTimeInput.placeholder = 'Enter finish time';
            finishTimeCell.appendChild(finishTimeInput);
            
            // Append all cells to the row
            row.appendChild(jobIdCell);
            row.appendChild(jobSizeCell);
            row.appendChild(loadingTimeCell);
            row.appendChild(finishTimeCell);
    
            // Add the row to the table body
            jobTableBody.appendChild(row);
    
            // Add event listener to the last input field of each row (for Enter key handling)
            const inputs = row.querySelectorAll('input');
            inputs.forEach((input, index) => {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        // Move focus to the next input field
                        if (index < inputs.length - 1) {
                            inputs[index + 1].focus();
                        } else {
                            // If it's the last input, move focus to the next job's job size
                            const nextRow = row.nextElementSibling;
                            if (nextRow) {
                                nextRow.querySelector('input').focus();
                            }
                        }
                    }
                });
            });
        }
    });

    
    
    // Update memory statistics
    function updateMemoryStats() {
        memoryTotalElement.textContent = totalMemory;
        
        let usedMemory = OS_KERNEL_SIZE;
        
        if (memorySlots.length > 0) {
            usedMemory = memorySlots.reduce((acc, slot) => {
                return acc + (slot.type !== 'free' ? slot.size : 0);
            }, 0);
        }
        
        const freeMemory = totalMemory - usedMemory;
        
        memoryUsedElement.textContent = usedMemory;
        memoryFreeElement.textContent = freeMemory;
    }
    
    // Log an event
    function logEvent(message) {
        const timeStamp = currentTime;
        const logEntry = document.createElement('div');
        logEntry.classList.add('event-log-entry');
        logEntry.textContent = `[${timeStamp} ms] ${message}`;
        eventLogElement.appendChild(logEntry);
        eventLogElement.scrollTop = eventLogElement.scrollHeight;
    }
    
    // Start the simulation
    function startSimulation() {
        if (simulationRunning) return;
        
        // Reset to initial state
        currentTime = 0;
        timerElement.textContent = '0 ms';
        
        // Reset job statuses
        jobs.forEach(job => {
            job.status = 'waiting';
            job.position = -1;
        });
        
        // Reset memory slots
        initMemoryVisualization();
        
        // Clear event log
        eventLogElement.innerHTML = '';
        logEvent('Simulation started');
        
        // Disable generate table and start buttons
        generateTableBtn.disabled = true;
        startSimulationBtn.disabled = true;
        
        // Mark simulation as running
        simulationRunning = true;
        
        // Start timer
        timer = setInterval(updateSimulation, 10); // Update every 10ms
    }
    
    // Reset the simulation
    function resetSimulation() {
        // Stop timer if running
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        
        // Reset time
        currentTime = 0;
        timerElement.textContent = '0 ms';
        
        // Clear event log
        eventLogElement.innerHTML = '';
        
        // Reset job statuses
        jobs.forEach(job => {
            job.status = 'waiting';
            job.position = -1;
        });
        
        // Reset memory visualization
        initMemoryVisualization();
        updateMemoryStats();
        
        // Enable buttons
        generateTableBtn.disabled = false;
        startSimulationBtn.disabled = false;
        
        // Mark simulation as stopped
        simulationRunning = false;
        
        logEvent('Simulation reset');
    }
    
    // Update the simulation state
    function updateSimulation() {
        // Increment time
        currentTime += 10;
        timerElement.textContent = `${currentTime} ms`;
        
        // Process jobs
        processJobs();
        
        // Check if all jobs are finished
        const allFinished = jobs.every(job => job.status === 'finished');
        if (allFinished) {
            clearInterval(timer);
            timer = null;
            simulationRunning = false;
            logEvent('All jobs have completed');
            startSimulationBtn.disabled = false;
            generateTableBtn.disabled = false;
        }
    }
    
    // Process jobs based on their status and time
    function processJobs() {
        // Process waiting jobs that should start loading
        jobs.forEach(job => {
            if (job.status === 'waiting' && currentTime >= job.loadingTime) {
                tryAllocateJob(job);
            }
        });
        
        // Process running jobs that should finish
        jobs.forEach(job => {
            if (job.status === 'running' && currentTime >= job.loadingTime + job.finishTime) {
                deallocateJob(job);
            }
        });
    }
    
    // Try to allocate memory for a job
    function tryAllocateJob(job) {
        // Find a suitable free memory slot
        let freeSlotIndex = -1;
        
        for (let i = 0; i < memorySlots.length; i++) {
            if (memorySlots[i].type === 'free' && memorySlots[i].size >= job.size) {
                freeSlotIndex = i;
                break;
            }
        }
        
        if (freeSlotIndex === -1) {
            // No suitable slot found, compact memory and try again
            compactMemory();
            
            // After compaction, find a suitable free memory slot
            for (let i = 0; i < memorySlots.length; i++) {
                if (memorySlots[i].type === 'free' && memorySlots[i].size >= job.size) {
                    freeSlotIndex = i;
                    break;
                }
            }
            
            // If still no suitable slot, job must wait
            if (freeSlotIndex === -1) {
                logEvent(`${job.id} (${job.size}KB) waiting - not enough memory`);
                return;
            }
        }
        
        // Allocate memory for the job
        const freeSlot = memorySlots[freeSlotIndex];
        
        // Create new job slot
        const jobSlot = {
            type: 'job',
            size: job.size,
            jobId: job.id
        };
        
        // Update free slot size or remove it
        if (freeSlot.size === job.size) {
            // Replace free slot with job slot
            memorySlots[freeSlotIndex] = jobSlot;
        } else {
            // Split free slot
            const remainingSize = freeSlot.size - job.size;
            memorySlots[freeSlotIndex] = jobSlot;
            
            // Add new free slot after job slot
            memorySlots.splice(freeSlotIndex + 1, 0, {
                type: 'free',
                size: remainingSize,
                jobId: null
            });
        }
        
        // Update job status
        job.status = 'running';
        job.position = freeSlotIndex;
        
        // Update memory visualization
        updateMemoryVisualization();
        updateMemoryStats();
        
        logEvent(`${job.id} (${job.size}KB) allocated memory`);
    }
    
    // Deallocate memory for a job
    function deallocateJob(job) {
        // Find job in memory slots
        const jobSlotIndex = memorySlots.findIndex(slot => slot.type === 'job' && slot.jobId === job.id);
        
        if (jobSlotIndex !== -1) {
            // Convert job slot to free slot
            memorySlots[jobSlotIndex] = {
                type: 'free',
                size: job.size,
                jobId: null
            };
            
            // Update job status
            job.status = 'finished';
            job.position = -1;
            
            // Merge adjacent free slots
            mergeAdjacentFreeSlots();
            
            // Compact memory
            compactMemory();
            
            // Update memory visualization
            updateMemoryVisualization();
            updateMemoryStats();
            
            logEvent(`${job.id} (${job.size}KB) finished and released memory`);
        }
    }
    
    // Merge adjacent free memory slots
    function mergeAdjacentFreeSlots() {
        let i = 0;
        while (i < memorySlots.length - 1) {
            if (memorySlots[i].type === 'free' && memorySlots[i + 1].type === 'free') {
                // Merge slots
                memorySlots[i].size += memorySlots[i + 1].size;
                memorySlots.splice(i + 1, 1);
            } else {
                i++;
            }
        }
    }
    
    // Compact memory (relocate all jobs to remove fragmentation)
    function compactMemory() {
        // Skip if there are no jobs in memory
        const jobSlots = memorySlots.filter(slot => slot.type === 'job');
        if (jobSlots.length === 0) return;
        
        // Create new memory allocation
        const newMemorySlots = [
            { type: 'os', size: OS_KERNEL_SIZE, jobId: null }
        ];
        
        // Add all job slots consecutively
        let currentPosition = OS_KERNEL_SIZE;
        jobSlots.forEach(jobSlot => {
            newMemorySlots.push({
                type: 'job',
                size: jobSlot.size,
                jobId: jobSlot.jobId
            });
            
            // Update job position
            const job = jobs.find(j => j.id === jobSlot.jobId);
            if (job) {
                job.position = newMemorySlots.length - 1;
            }
            
            currentPosition += jobSlot.size;
        });
        
        // Add remaining space as free slot
        const freeSize = totalMemory - currentPosition;
        if (freeSize > 0) {
            newMemorySlots.push({
                type: 'free',
                size: freeSize,
                jobId: null
            });
        }
        
        // Replace memory slots
        memorySlots = newMemorySlots;
        
        logEvent('Memory compaction performed');
    }
    
    
    // Initialize the application
    init();
});