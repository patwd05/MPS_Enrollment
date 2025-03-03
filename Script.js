// dashboard_logic.js

document.addEventListener("DOMContentLoaded", function () {
    const regionSelect = document.getElementById("regionSelect");
    const enrollmentCtx = document.getElementById("enrollmentHistogram").getContext("2d");
    const historicCtx = document.getElementById("historicChangeChart").getContext("2d");
    const enrollmentTrendCtx = document.getElementById("enrollmentTrendChart").getContext("2d");
    const attendancePercentCtx = document.getElementById("attendancePercentChart").getContext("2d");
    const levelColors = {
        "Elementary School": "#FF530D",
        "Middle School": "#0033A0",
        "High School": "#00857D",
        "K-8": "#FFC72C",
        "Unknown": "#7F2268"
    };
    

    
    let allData = [];

    // Load CSV Data
    Papa.parse("MPS Data.csv", {
        download: true,
        header: true,
        complete: function (results) {
            allData = results.data;
            console.log("CSV Data Loaded:", allData); // Check if data is loading
    
            populateRegions(allData);
            
            console.log("Updating Histogram Chart...");
            updateHistogram(allData);
    
            console.log("Updating Historic Change Chart...");
            updateBarChart(allData);
    
            console.log("Updating Enrollment Trends Chart...");
            console.log("Data for Enrollment Trends:", allData); // Debug data
            updateEnrollmentTrends(allData);
    
            console.log("Updating Attendance Percent Chart...");
            console.log("Data for Attendance Percent:", allData); // Debug data
            updateAttendancePercentChart(allData);
        }
    });

    // Populate dropdown with unique regions
    function populateRegions(data) {
        const regions = [...new Set(data.map(d => d["Geographic Region"] ? d["Geographic Region"].trim() : "Unknown"))];
        regions.forEach(region => {
            if (region) {  // Ensure region is not empty or undefined
                let option = document.createElement("option");
                option.value = region;
                option.textContent = region;
                regionSelect.appendChild(option);
            }
        });
        console.log("Regions added:", regions); // Debugging line
    }
    

    // Filter and update charts
    regionSelect.addEventListener("change", function () {
        updateCharts(regionSelect.value);
    });

    function updateCharts(region) {
        console.log("Updating charts for region:", region);
        const filteredData = region === "All" ? allData : allData.filter(d => d["Geographic Region"]?.trim() === region);
    
        console.log("Filtered Data:", filteredData);
    
        updateHistogram(filteredData);
        updateBarChart(filteredData);
        updateEnrollmentTrends(filteredData);
        updateAttendancePercentChart(filteredData);
    }
    
    function updateEnrollmentTrends(data) {
        const years = ["2014-2015", "2015-2016", "2016-2017", "2017-2018", "2018-2019", 
                       "2019-2020", "2020-2021", "2021-2022", "2022-2023", "2023-2024"];
        let trendData = {};
    
        // Group data by "Grouped School Levels"
        data.forEach(d => {
            console.log("Processing row:", d); // ADD THIS LINE FOR DEBUGGING
            const level = d["Grouped School Levels"] ? d["Grouped School Levels"].trim() : "Unknown";
            if (!trendData[level]) {
                trendData[level] = new Array(years.length).fill(0);
            }
    
            years.forEach((year, index) => {
                const value = parseInt(d[year], 10);
                if (!isNaN(value)) {
                    trendData[level][index] += value; // Aggregate enrollment by school level
                }
            });
        });
    
        // Convert to datasets format
        const datasets = Object.keys(trendData).map(level => ({
            label: level,
            data: trendData[level],
            borderColor: levelColors[level] || levelColors["Unknown"],
            fill: false,
            pointRadius: 5
        }));
    
        if (window.enrollmentTrendChart instanceof Chart) {
            window.enrollmentTrendChart.destroy();
        }        
        window.enrollmentTrendChart = new Chart(enrollmentTrendCtx, {
            type: "line",
            data: {
                labels: years,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: "Enrollment Trends by School Level (2014-2024)",
                        font: { size: 18 }
                    }
                },
                scales: {
                    x: { 
                        title: { display: true, text: "School Year", font: { size: 16 } },
                        ticks: { font: { size: 16 } } 
                    },
                    y: { 
                        title: { display: true, text: "Total Enrollment", font: { size: 16 } },
                        ticks: { font: { size: 16 } } 
                    }
                }
            }
        });
    }
    
    function updateAttendancePercentChart(data) {
        let schools = [];
        let percentages = [];
    
        // Extract & sort attendance data
        data.forEach(d => {
            console.log("Processing attendance row:", d); // ADD THIS LINE
            const percent = parseFloat(d["Percent Students Attending from attendance Area"]);
            if (!isNaN(percent)) {
                schools.push(d["Site list"] ? d["Site list"].trim() : "Unknown");
                percentages.push(percent);
            }
        });
    
        // Sort by attendance percentage
        const sortedIndexes = percentages.map((val, index) => ({ val, index }))
                                         .sort((a, b) => a.val - b.val)
                                         .map(obj => obj.index);
        schools = sortedIndexes.map(i => schools[i]);
        percentages = sortedIndexes.map(i => percentages[i]);
    
        if (window.attendancePercentChart instanceof Chart) {
            window.attendancePercentChart.destroy();
        }        
        window.attendancePercentChart = new Chart(attendancePercentCtx, {
            type: "bar",
            data: {
                labels: schools, // Hidden, but shows on hover
                datasets: [{
                    data: percentages,
                    backgroundColor: "steelblue"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: "x", // Vertical bars
                plugins: {
                    title: {
                        display: true,
                        text: "Percentage of Students Attending from Attendance Area",
                        font: { size: 18 }
                    },
                    tooltip: {
                        callbacks: {
                            label: (tooltipItem) => `${schools[tooltipItem.dataIndex]}: ${tooltipItem.raw}%`
                        }
                    }
                },
                scales: {
                    x: { 
                        display: false, 
                        ticks: { font: { size: 16 } } 
                    },
                    y: { 
                        title: { display: true, text: "Percentage (%)", font: { size: 16 } },
                        ticks: { font: { size: 16 } } 
                    }
                }
            }
        });
    }
    
    function updateHistogram(data) {
        const bins = [0, 200, 400, 600, 800, 1000];
        let groupedCounts = {};
        const levels = [...new Set(data.map(d => d["Grouped School Levels"]?.trim()))];
    
        levels.forEach(level => groupedCounts[level] = new Array(bins.length - 1).fill(0));
    
        data.forEach(d => {
            const enrollment = parseInt(d["2023-2024"], 10) || 0;
            const level = d["Grouped School Levels"]?.trim();
            for (let i = 0; i < bins.length - 1; i++) {
                if (enrollment >= bins[i] && enrollment < bins[i + 1]) {
                    groupedCounts[level][i]++;
                    break;
                }
            }
        });
    
        if (window.histogramChart) window.histogramChart.destroy();
        window.histogramChart = new Chart(enrollmentCtx, {
            type: "bar",
            data: {
                labels: bins.slice(0, -1).map((b, i) => `${b}-${bins[i+1]}`),
                datasets: levels.map(level => ({
                    label: level,
                    data: groupedCounts[level],
                    stack: "stack1", // Enable stacking
                    backgroundColor: levelColors[level] || "gray", // Use fixed colors
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { 
                        stacked: true, 
                        title: { display: true, text: "Enrollment Ranges", font: { size: 16 } },
                        ticks: { font: { size: 16 } }
                    },
                    y: { 
                        stacked: true, 
                        title: { display: true, text: "Number of Schools", font: { size: 16 } },
                        ticks: { font: { size: 16 } }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: "Enrollment Distribution by School Level",
                        font: { size: 18 }
                    }
                }
            }
            
        });
    }
    

    function updateBarChart(data) {
        const schoolNames = data.map(d => d["Site list"].trim());
        const changes = data.map(d => parseInt(d["5-year Historic Change"], 10) || 0);

        if (window.barChart) window.barChart.destroy();
        window.barChart = new Chart(historicCtx, {
            type: "bar",
            data: {
                labels: schoolNames,
                datasets: [{
                    data: changes,
                    backgroundColor: changes.map(val => val < 0 ? "#FF530D" : "#0033A0")
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { 
                        stacked: true, 
                        title: { display: true, text: "Change in Enrollment", font: { size: 16 } },
                        ticks: { font: { size: 14 } }
                    },
                    y: { 
                        stacked: true, 
                        title: { display: true, text: "Schools", font: { size: 16 } },
                        ticks: { font: { size: 14 } }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: "5-Year Historic Enrollment Changes",
                        font: { size: 18 }
                    }
                }
            }
            
        });
    }

    function getRandomColor() {
        return `hsl(${Math.random() * 360}, 70%, 50%)`;
    }
});
