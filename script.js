// Map initialization
let map;
let agents = [];
let locations = [];
let hub;
let cityCoordinates = {
    bangalore: [12.9716, 77.5946],
    mumbai: [19.0760, 72.8777],
    delhi: [28.6139, 77.2090],
    hyderabad: [17.3850, 78.4867],
    chennai: [13.0827, 80.2707]
};
let currentCity = "bangalore";
let routeLines = [];
let agentMarkers = [];
let deliverySimulation = null;
let isSimulationPlaying = false;
let simulationSpeed = 1;
let currentRoutes = [];

// Initialize the map
function initMap() {
    if (map) map.remove();
    
    const cityCoord = cityCoordinates[currentCity];
    map = L.map('visualization-map').setView(cityCoord, 13);
    
    // Use a more modern, clean map style with carto
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
}

// Initialize the application
function init() {
    initMap();
    generateAgentsLegend();
    
    // Fix event listeners to ensure they're properly connected
    document.getElementById('generateBtn').addEventListener('click', generateRandomLocations);
    document.getElementById('solveButton').addEventListener('click', optimizeRoutes);
    document.getElementById('clearBtn').addEventListener('click', clearMap);
    
    // Fix simulation controls
    document.getElementById('play-pause-btn').addEventListener('click', toggleSimulation);
    document.getElementById('restart-btn').addEventListener('click', restartSimulation);
    document.getElementById('simulation-speed').addEventListener('change', changeSimulationSpeed);
    document.getElementById('simulation-timeline').addEventListener('input', updateSimulationProgress);
    
    // Disable simulation controls initially
    document.getElementById('simulation-timeline').disabled = true;
    document.getElementById('play-pause-btn').disabled = true;
    document.getElementById('restart-btn').disabled = true;
    
    // Set up resize handler for the details panel
    setupResizeHandler();
    
    // Modal setup
    setupModal();
    
    console.log("Application initialized"); // Debug logging
}

function changeCity() {
    currentCity = document.getElementById('city').value;
    document.getElementById('city-title').innerText = `${currentCity.charAt(0).toUpperCase() + currentCity.slice(1)} Route Optimization`;
    clearMap();
    initMap();
}

function changeAgents(change) {
    const input = document.getElementById('numSalesmen');
    const newValue = parseInt(input.value) + change;
    
    if (newValue >= parseInt(input.min) && newValue <= parseInt(input.max)) {
        input.value = newValue;
        generateAgentsLegend();
    }
}

function changeLocations(change) {
    const input = document.getElementById('numLocations');
    const newValue = parseInt(input.value) + change;
    
    if (newValue >= parseInt(input.min) && newValue <= parseInt(input.max)) {
        input.value = newValue;
    }
}

function generateAgentsLegend() {
    const numAgents = parseInt(document.getElementById('numSalesmen').value);
    const legendContainer = document.getElementById('agents-legend');
    legendContainer.innerHTML = '';
    
    for (let i = 0; i < numAgents; i++) {
        const color = getAgentColor(i);
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <div class="legend-icon agent" style="color: ${color}">
                <i class="fas fa-motorcycle"></i>
            </div>
            <div class="legend-text">Agent ${i + 1}</div>
        `;
        legendContainer.appendChild(item);
    }
}

function getAgentColor(index) {
    // Modern, vibrant color palette for better visual distinction
    const colors = [
        '#FF5252', // Red
        '#448AFF', // Blue
        '#4CAF50', // Green
        '#FF9800', // Orange
        '#9C27B0', // Purple
        '#00BCD4', // Cyan
        '#FFEB3B', // Yellow
        '#E91E63', // Pink
        '#3F51B5', // Indigo
        '#009688', // Teal
        '#795548', // Brown
        '#607D8B'  // Blue Grey
    ];
    return colors[index % colors.length];
}

function generateRandomLocations() {
    clearMap();
    showLoading();
    
    const numLocations = parseInt(document.getElementById('numLocations').value);
    const cityCenter = cityCoordinates[currentCity];
    
    // Generate hub (distribution center)
    hub = {
        lat: cityCenter[0],
        lng: cityCenter[1],
        id: 'hub',
        type: 'hub',
        name: 'Distribution Center'
    };
    
    // Create hub marker
    const hubIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="hub-marker"><i class="fas fa-warehouse"></i></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });
    
    L.marker([hub.lat, hub.lng], {icon: hubIcon})
        .addTo(map)
        .bindPopup('<b>Distribution Center</b>')
        .on('click', () => showLocationDetails(hub));
    
    // Generate delivery locations
    locations = [];
    for (let i = 0; i < numLocations; i++) {
        // Random location within ~5km of city center
        const lat = cityCenter[0] + (Math.random() - 0.5) * 0.09;
        const lng = cityCenter[1] + (Math.random() - 0.5) * 0.09;
        
        const location = {
            lat,
            lng,
            id: `loc-${i}`,
            type: 'location',
            name: `Order #${i + 1}`,
            customer: generateRandomName(),
            address: generateRandomAddress(currentCity),
            items: generateRandomItems(),
            orderTime: generateRandomOrderTime()
        };
        
        locations.push(location);
        
        // Create location marker
        const locIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="location-marker"><i class="fas fa-house-user"></i></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        L.marker([location.lat, location.lng], {icon: locIcon})
            .addTo(map)
            .bindPopup(`<b>${location.name}</b><br>${location.address}`)
            .on('click', () => showLocationDetails(location));
    }
    
    hideLoading();
    updateStats();
    console.log("Generated locations:", locations.length); // Debug logging
}

function generateRandomName() {
    const firstNames = ['John', 'Emma', 'Raj', 'Priya', 'Amit', 'Sara', 'Michael', 'Sophia', 'Arjun', 'Zara'];
    const lastNames = ['Smith', 'Patel', 'Kumar', 'Singh', 'Sharma', 'Johnson', 'Williams', 'Brown', 'Gupta', 'Khan'];
    
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

function generateRandomAddress(city) {
    const houseNumbers = ['12', '45', '78A', '23B', '56', '89C', '34', '67D', '90'];
    const streets = ['Main Street', 'Park Avenue', 'Lake View Road', 'Green Lane', 'Tech Park Road', 'Hill Street'];
    const areas = {
        bangalore: ['Indiranagar', 'Koramangala', 'HSR Layout', 'Whitefield', 'Jayanagar'],
        mumbai: ['Bandra', 'Andheri', 'Juhu', 'Worli', 'Powai'],
        delhi: ['Connaught Place', 'Hauz Khas', 'Saket', 'Lajpat Nagar', 'Dwarka'],
        hyderabad: ['Banjara Hills', 'Jubilee Hills', 'Gachibowli', 'Hitech City', 'Secunderabad'],
        chennai: ['T Nagar', 'Adyar', 'Nungambakkam', 'Besant Nagar', 'Anna Nagar']
    };
    
    const houseNumber = houseNumbers[Math.floor(Math.random() * houseNumbers.length)];
    const street = streets[Math.floor(Math.random() * streets.length)];
    const area = areas[city][Math.floor(Math.random() * areas[city].length)];
    
    return `${houseNumber}, ${street}, ${area}, ${city.charAt(0).toUpperCase() + city.slice(1)}`;
}

function generateRandomItems() {
    const items = [
        'Butter Chicken with Naan', 'Veg Biryani', 'Paneer Tikka', 'Masala Dosa',
        'Pizza Margherita', 'Chicken Burger', 'Hakka Noodles', 'Caesar Salad',
        'Chocolate Brownie', 'Ice Cream Sundae', 'Mango Lassi', 'Cold Coffee'
    ];
    
    const numberOfItems = Math.floor(Math.random() * 3) + 1;
    const orderItems = [];
    
    for (let i = 0; i < numberOfItems; i++) {
        orderItems.push(items[Math.floor(Math.random() * items.length)]);
    }
    
    return orderItems;
}

function generateRandomOrderTime() {
    const now = new Date();
    // Random time within last hour
    const randomMinutesAgo = Math.floor(Math.random() * 60);
    now.setMinutes(now.getMinutes() - randomMinutesAgo);
    return now;
}

function optimizeRoutes() {
    if (locations.length === 0) {
        alert('Please generate delivery locations first!');
        return;
    }
    
    showLoading();
    const startTime = performance.now();
    
    setTimeout(() => {
        const numAgents = parseInt(document.getElementById('numSalesmen').value);
        const algorithm = document.getElementById('algorithm').value;
        
        // Clear previous routes
        clearRoutes();
        
        // Generate optimized routes
        currentRoutes = simulateOptimization(hub, locations, numAgents, algorithm);
        
        // Draw routes on map
        drawRoutes(currentRoutes);
        
        // Calculate statistics
        const totalDistance = calculateTotalDistance(currentRoutes);
        const computationTime = performance.now() - startTime;
        
        // Update statistics display
        document.getElementById('totalDistance').innerText = `${totalDistance.toFixed(2)} km`;
        document.getElementById('computationTime').innerText = `${computationTime.toFixed(0)} ms`;
        document.getElementById('locationsPerAgent').innerText = 
            (locations.length / numAgents).toFixed(1);
        
        // Set active deliveries count
        document.getElementById('activeDeliveries').innerText = numAgents;
        
        hideLoading();
        
        // Prepare simulation
        prepareDeliverySimulation(currentRoutes);
        
        // Update route details
        updateRouteDetails(currentRoutes);
        
        console.log("Routes optimized:", currentRoutes.length); // Debug logging
        
    }, 1000); // Simulate computation time
}

function simulateOptimization(hub, locations, numAgents, algorithm) {
    // This is a simplified algorithm that divides locations among agents
    // In a real app, this would be replaced by actual optimization algorithms
    
    let routes = [];
    const locationsPerAgent = Math.ceil(locations.length / numAgents);
    
    for (let i = 0; i < numAgents; i++) {
        const agentLocations = locations.slice(
            i * locationsPerAgent, 
            Math.min((i + 1) * locationsPerAgent, locations.length)
        );
        
        if (agentLocations.length === 0) continue;
        
        // Add hub as start and end point
        const route = {
            agentId: i,
            color: getAgentColor(i),
            points: [hub, ...optimizeLocationOrder(hub, agentLocations), hub],
            distanceKm: 0
        };
        
        // Calculate distance
        for (let j = 1; j < route.points.length; j++) {
            route.distanceKm += calculateDistance(
                route.points[j-1].lat, route.points[j-1].lng,
                route.points[j].lat, route.points[j].lng
            );
        }
        
        routes.push(route);
    }
    
    return routes;
}

function optimizeLocationOrder(hub, locations) {
    // Simple nearest neighbor algorithm
    // In a real app, this would be replaced by more sophisticated algorithms
    
    let result = [];
    let unvisited = [...locations];
    
    let current = hub;
    while (unvisited.length > 0) {
        // Find nearest unvisited location
        let minDist = Infinity;
        let minIndex = -1;
        
        for (let i = 0; i < unvisited.length; i++) {
            const dist = calculateDistance(
                current.lat, current.lng,
                unvisited[i].lat, unvisited[i].lng
            );
            
            if (dist < minDist) {
                minDist = dist;
                minIndex = i;
            }
        }
        
        // Move to nearest location
        current = unvisited[minIndex];
        result.push(current);
        unvisited.splice(minIndex, 1);
    }
    
    return result;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    // Calculate distance between two points in km using Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
        
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function calculateTotalDistance(routes) {
    return routes.reduce((total, route) => total + route.distanceKm, 0);
}

function drawRoutes(routes) {
    routes.forEach(route => {
        const pathPoints = route.points.map(p => [p.lat, p.lng]);
        
        // Create polyline with better styling and animated gradient effect
        const routeLine = L.polyline(pathPoints, {
            color: route.color,
            weight: 4,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round',
            dashArray: '10, 10',
            dashOffset: '0',
            className: 'animated-route'
        }).addTo(map);
        
        // Add animated dash array with modern effect
        animateRouteLine(routeLine, route.color);
        
        routeLines.push(routeLine);
        
        // Add location markers with enhanced styling
        for (let i = 1; i < route.points.length - 1; i++) {
            const point = route.points[i];
            // Add marker number labels to indicate visit order with improved styling
            const orderIcon = L.divIcon({
                className: 'order-number-icon',
                html: `<div class="order-number" style="background-color:${route.color}">${i}</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            
            L.marker([point.lat, point.lng], { icon: orderIcon }).addTo(map);
        }
    });
}

function animateRouteLine(polyline, color) {
    // Enhanced animation with better visual effect
    let offset = 0;
    
    // Create a subtle pulsing effect with CSS
    if (polyline._path) {
        polyline._path.style.strokeDasharray = '10, 10';
        polyline._path.style.transition = 'stroke-dashoffset 0.5s ease';
        polyline._path.style.stroke = color;
        
        // Add a subtle shadow for depth
        polyline._path.style.filter = 'drop-shadow(0 0 2px rgba(0,0,0,0.3))';
    }
    
    const animate = () => {
        offset -= 1;
        if (polyline._path) {
            polyline._path.style.strokeDashoffset = offset;
        }
        requestAnimationFrame(animate);
    };
    animate();
}

function prepareDeliverySimulation(routes) {
    console.log("Preparing simulation for routes:", routes.length);
    
    // Reset previous simulation
    if (deliverySimulation) {
        clearTimeout(deliverySimulation);
        deliverySimulation = null;
    }
    
    // Clear previous agent markers
    agentMarkers.forEach(marker => marker.remove());
    agentMarkers = [];
    
    // Create agent markers for each route with enhanced styling
    routes.forEach((route, agentIndex) => {
        const agentIcon = L.divIcon({
            className: 'agent-icon',
            html: `<div class="agent-marker" style="color: ${route.color}; background-color: white; box-shadow: 0 2px 10px rgba(0,0,0,0.2), 0 0 0 3px ${route.color};">
                     <i class="fas fa-motorcycle"></i>
                   </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
        
        // Start at hub with smooth animation enabled
        const marker = L.marker([route.points[0].lat, route.points[0].lng], {
            icon: agentIcon,
            rotationAngle: 0,
            rotationOrigin: 'center center'
        }).addTo(map);
        
        marker.agentId = agentIndex;
        marker.on('click', () => showAgentDetails(agentIndex));
        
        // Add a subtle shadow effect
        if (marker._icon) {
            marker._icon.style.transition = 'transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)';
            marker._icon.style.filter = 'drop-shadow(0 3px 5px rgba(0,0,0,0.2))';
        }
        
        agentMarkers.push(marker);
    });
    
    // Reset and enable timeline slider
    document.getElementById('simulation-timeline').value = 0;
    document.getElementById('simulation-timeline').disabled = false;
    document.getElementById('play-pause-btn').disabled = false;
    document.getElementById('restart-btn').disabled = false;
    
    // Reset play button icon
    document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-play"></i>';
    isSimulationPlaying = false;
}

function startDeliverySimulation() {
    if (!currentRoutes.length) {
        console.log("No routes to simulate!");
        return;
    }
    
    console.log("Starting simulation!");
    
    isSimulationPlaying = true;
    document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-pause"></i>';
    
    // Get current progress from timeline slider (0-100%)
    let progress = parseInt(document.getElementById('simulation-timeline').value);
    
    // Create waypoints for smooth animation with more points for smoother movement
    const routeWaypoints = currentRoutes.map(route => {
        let points = [];
        for (let i = 0; i < route.points.length - 1; i++) {
            const startPoint = route.points[i];
            const endPoint = route.points[i+1];
            const segmentPoints = createWaypoints(
                startPoint.lat, startPoint.lng,
                endPoint.lat, endPoint.lng,
                30 // increased number of points for smoother animation
            );
            points = points.concat(segmentPoints);
        }
        return points;
    });
    
    // Pre-calculate delivery completion points for visual effects
    const deliveryPoints = currentRoutes.map(route => {
        const deliveryIndexes = [];
        let totalPoints = 0;
        
        for (let i = 0; i < route.points.length - 2; i++) {
            const startPoint = route.points[i];
            const endPoint = route.points[i+1];
            const segmentPoints = createWaypoints(
                startPoint.lat, startPoint.lng,
                endPoint.lat, endPoint.lng,
                30
            );
            
            totalPoints += segmentPoints.length;
            // The last point in the segment is the delivery point
            deliveryIndexes.push(totalPoints - 1);
        }
        
        return deliveryIndexes;
    });
    
    function animate() {
        if (!isSimulationPlaying) return;
        
        // Update progress based on simulation speed with smoother increment
        progress += 0.3 * simulationSpeed;
        
        if (progress >= 100) {
            // Animation complete
            progress = 100;
            document.getElementById('simulation-timeline').value = progress;
            document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-play"></i>';
            isSimulationPlaying = false;
            return;
        }
        
        // Update timeline slider
        document.getElementById('simulation-timeline').value = progress;
        
        // Move each agent marker along their route with improved animation
        routeWaypoints.forEach((waypoints, agentIndex) => {
            if (!agentMarkers[agentIndex] || waypoints.length === 0) return;
            
            // Calculate current position index based on progress
            const pointIndex = Math.min(
                Math.floor((progress / 100) * waypoints.length),
                waypoints.length - 1
            );
            
            const point = waypoints[pointIndex];
            const marker = agentMarkers[agentIndex];
            
            // Calculate rotation angle for smooth turning with improved angles
            if (pointIndex > 0) {
                const prevPoint = waypoints[pointIndex - 1];
                const angle = calculateAngle(
                    prevPoint.lat, prevPoint.lng,
                    point.lat, point.lng
                );
                
                // Apply smooth rotation with easing
                marker.setRotationAngle(angle);
                
                // Add tilt effect during turns
                const tilt = Math.min(Math.abs(angle % 90) / 90 * 15, 15);
                if (marker._icon) {
                    marker._icon.style.transform += ` skewX(${tilt}deg)`;
                }
            }
            
            // Move marker with enhanced animation
            marker.setLatLng([point.lat, point.lng]);
            
            // Check if we've reached a delivery point and show effect
            const deliveryPointIndexes = deliveryPoints[agentIndex];
            if (deliveryPointIndexes && deliveryPointIndexes.includes(pointIndex)) {
                showDeliveryEffect(point.lat, point.lng, currentRoutes[agentIndex].color);
            }
        });
        
        // Update any visible agent details panel
        const selectedAgentIndex = document.getElementById('agent-details-content').getAttribute('data-agent');
        if (selectedAgentIndex !== null && selectedAgentIndex !== undefined) {
            showAgentDetails(parseInt(selectedAgentIndex));
        }
        
        // Continue animation with better timing
        deliverySimulation = setTimeout(animate, 40); // Smoother 25fps animation
    }
    
    // Start animation
    animate();
}

// Add a new function to show a delivery completion effect
function showDeliveryEffect(lat, lng, color) {
    // Create a pulse effect at delivery location
    const pulseIcon = L.divIcon({
        className: 'delivery-pulse-icon',
        html: `<div class="delivery-pulse" style="background-color: ${color}"></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });
    
    const pulseMarker = L.marker([lat, lng], {
        icon: pulseIcon,
        zIndexOffset: 1000
    }).addTo(map);
    
    // Remove the pulse effect after animation completes
    setTimeout(() => {
        map.removeLayer(pulseMarker);
    }, 1000);
}

function createWaypoints(lat1, lng1, lat2, lng2, numPoints) {
    const waypoints = [];
    
    for (let i = 0; i <= numPoints; i++) {
        const fraction = i / numPoints;
        const lat = lat1 + fraction * (lat2 - lat1);
        const lng = lng1 + fraction * (lng2 - lng1);
        waypoints.push({ lat, lng });
    }
    
    return waypoints;
}

function calculateAngle(lat1, lng1, lat2, lng2) {
    const dLng = lng2 - lng1;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    
    let angle = Math.atan2(y, x) * 180 / Math.PI;
    return angle;
}

function toggleSimulation() {
    console.log("Toggle simulation. Current state:", isSimulationPlaying);
    
    if (isSimulationPlaying) {
        // Pause simulation
        isSimulationPlaying = false;
        document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-play"></i>';
        if (deliverySimulation) {
            clearTimeout(deliverySimulation);
            deliverySimulation = null;
        }
    } else {
        // Start or resume simulation
        startDeliverySimulation();
    }
}

function restartSimulation() {
    // Stop current simulation
    if (deliverySimulation) {
        clearTimeout(deliverySimulation);
        deliverySimulation = null;
    }
    
    // Reset progress
    document.getElementById('simulation-timeline').value = 0;
    isSimulationPlaying = false;
    document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-play"></i>';
    
    // Move markers back to starting positions
    currentRoutes.forEach((route, agentIndex) => {
        if (agentMarkers[agentIndex]) {
            agentMarkers[agentIndex].setLatLng([route.points[0].lat, route.points[0].lng]);
            agentMarkers[agentIndex].setRotationAngle(0);
        }
    });
}

function updateSimulationProgress() {
    // Manual update of simulation progress via slider
    if (!currentRoutes.length) return;
    
    const progress = parseInt(document.getElementById('simulation-timeline').value);
    
    // Create waypoints if not already created
    const routeWaypoints = currentRoutes.map(route => {
        let points = [];
        for (let i = 0; i < route.points.length - 1; i++) {
            const startPoint = route.points[i];
            const endPoint = route.points[i+1];
            const segmentPoints = createWaypoints(
                startPoint.lat, startPoint.lng,
                endPoint.lat, endPoint.lng,
                20 // number of points per segment
            );
            points = points.concat(segmentPoints);
        }
        return points;
    });
    
    // Update each agent marker position
    routeWaypoints.forEach((waypoints, agentIndex) => {
        if (!agentMarkers[agentIndex] || waypoints.length === 0) return;
        
        // Calculate current position index based on progress
        const pointIndex = Math.min(
            Math.floor((progress / 100) * waypoints.length),
            waypoints.length - 1
        );
        
        const point = waypoints[pointIndex];
        const marker = agentMarkers[agentIndex];
        
        // Calculate rotation angle for correct orientation
        if (pointIndex > 0) {
            const prevPoint = waypoints[pointIndex - 1];
            const angle = calculateAngle(
                prevPoint.lat, prevPoint.lng,
                point.lat, point.lng
            );
            marker.setRotationAngle(angle);
        }
        
        // Update marker position
        marker.setLatLng([point.lat, point.lng]);
    });
    
    // Update delivery status in agent details if shown
    const selectedAgentIndex = document.getElementById('agent-details-content').getAttribute('data-agent');
    if (selectedAgentIndex !== null && selectedAgentIndex !== undefined) {
        showAgentDetails(parseInt(selectedAgentIndex));
    }
}

function changeSimulationSpeed() {
    simulationSpeed = parseFloat(document.getElementById('simulation-speed').value);
    console.log("Simulation speed changed to:", simulationSpeed);
}

function updateStats() {
    // Update basic stats when locations are generated
    document.getElementById('totalDistance').innerText = '0 km';
    document.getElementById('computationTime').innerText = '0 ms';
    document.getElementById('locationsPerAgent').innerText = 
        (locations.length / parseInt(document.getElementById('numSalesmen').value)).toFixed(1);
}

function clearMap() {
    // Stop simulation
    if (deliverySimulation) {
        clearTimeout(deliverySimulation);
        deliverySimulation = null;
    }
    
    // Reset simulation controls
    document.getElementById('simulation-timeline').value = 0;
    document.getElementById('simulation-timeline').disabled = true;
    document.getElementById('play-pause-btn').disabled = true;
    document.getElementById('restart-btn').disabled = true;
    document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-play"></i>';
    isSimulationPlaying = false;
    
    // Clear routes and markers
    clearRoutes();
    
    // Remove all markers
    if (map) {
        map.eachLayer(layer => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                layer.remove();
            }
        });
    }
    
    // Reset data
    locations = [];
    hub = null;
    currentRoutes = [];
    
    // Reset stats
    document.getElementById('totalDistance').innerText = '0 km';
    document.getElementById('computationTime').innerText = '0 ms';
    document.getElementById('locationsPerAgent').innerText = '0';
    if (document.getElementById('activeDeliveries')) {
        document.getElementById('activeDeliveries').innerText = '0';
    }
    
    // Clear details
    document.getElementById('agent-details-content').innerHTML = '<p>Select an agent on the map to view details</p>';
    document.getElementById('route-details-content').innerHTML = '';
}

function clearRoutes() {
    // Clear polylines
    routeLines.forEach(line => line.remove());
    routeLines = [];
    
    // Clear agent markers
    agentMarkers.forEach(marker => marker.remove());
    agentMarkers = [];
}

function showAgentDetails(agentIndex) {
    if (!currentRoutes[agentIndex]) return;
    
    const route = currentRoutes[agentIndex];
    const detailsEl = document.getElementById('agent-details-content');
    
    // Store the selected agent index for updates
    detailsEl.setAttribute('data-agent', agentIndex);
    
    // Get current simulation progress for status
    const progress = parseInt(document.getElementById('simulation-timeline').value);
    
    let locationsHtml = '';
    for (let i = 1; i < route.points.length - 1; i++) {
        const point = route.points[i];
        locationsHtml += `
            <div class="delivery-item">
                <div class="delivery-icon" style="color: ${route.color}">
                    <i class="fas fa-box"></i>
                </div>
                <div class="delivery-details">
                    <div class="delivery-title">${point.name}</div>
                    <div class="delivery-address">${point.address || ''}</div>
                </div>
                <div class="delivery-status">
                    ${getDeliveryStatus(i, route.points.length - 2, progress)}
                </div>
            </div>
        `;
    }
    
    detailsEl.innerHTML = `
        <div class="agent-header">
            <div class="agent-icon" style="color: ${route.color}">
                <i class="fas fa-motorcycle"></i>
            </div>
            <div class="agent-info">
                <h4>Delivery Agent ${agentIndex + 1}</h4>
                <div class="agent-stats">
                    <div><i class="fas fa-route"></i> ${route.distanceKm.toFixed(2)} km</div>
                    <div><i class="fas fa-box"></i> ${route.points.length - 2} orders</div>
                </div>
            </div>
        </div>
        <div class="deliveries-list">
            <h5>Delivery Sequence</h5>
            ${locationsHtml}
        </div>
    `;
}

function getDeliveryStatus(index, total, progress) {
    // Calculate the point in the simulation where this delivery would be completed
    const statusThreshold = (index / total) * 100;
    
    if (progress < statusThreshold - 5) { // Not yet close
        return '<span class="status pending"><i class="fas fa-clock"></i> Pending</span>';
    } else if (progress < statusThreshold) { // Getting close
        return '<span class="status approaching"><i class="fas fa-motorcycle"></i> Approaching</span>';
    } else { // Delivered
        return '<span class="status delivered"><i class="fas fa-check-circle"></i> Delivered</span>';
    }
}

function updateRouteDetails(routes) {
    const detailsEl = document.getElementById('route-details-content');
    
    let routesHtml = '';
    routes.forEach((route, index) => {
        routesHtml += `
            <div class="route-summary-item" onclick="showAgentDetails(${index})">
                <div class="route-agent-icon" style="color: ${route.color}">
                    <i class="fas fa-motorcycle"></i>
                </div>
                <div class="route-info">
                    <div class="route-title">Agent ${index + 1}</div>
                    <div class="route-stats">
                        <span><i class="fas fa-route"></i> ${route.distanceKm.toFixed(2)} km</span>
                        <span><i class="fas fa-box"></i> ${route.points.length - 2} orders</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    detailsEl.innerHTML = `
        <div class="route-summary">
            ${routesHtml}
        </div>
    `;
}

function showLocationDetails(location) {
    const modal = document.getElementById('order-modal');
    const details = document.getElementById('order-details');
    
    if (location.type === 'hub') {
        details.innerHTML = `
            <div class="hub-details">
                <div class="hub-icon"><i class="fas fa-warehouse"></i></div>
                <h3>Distribution Center</h3>
                <p>Central hub for all delivery operations</p>
                <p>Location: ${currentCity.charAt(0).toUpperCase() + currentCity.slice(1)}</p>
            </div>
        `;
    } else {
        const formattedTime = formatOrderTime(location.orderTime);
        
        let itemsList = '';
        if (location.items && location.items.length) {
            itemsList = '<ul class="order-items-list">' +
                location.items.map(item => `<li><i class="fas fa-utensils"></i> ${item}</li>`).join('') +
                '</ul>';
        }
        
        details.innerHTML = `
            <div class="order-details-container">
                <div class="order-header">
                    <div class="order-number">${location.name}</div>
                    <div class="order-time">${formattedTime}</div>
                </div>
                <div class="customer-details">
                    <div class="detail-row">
                        <span class="detail-label"><i class="fas fa-user"></i> Customer:</span>
                        <span class="detail-value">${location.customer}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label"><i class="fas fa-map-marker-alt"></i> Address:</span>
                        <span class="detail-value">${location.address}</span>
                    </div>
                </div>
                <div class="order-items">
                    <h4>Order Items</h4>
                    ${itemsList}
                </div>
            </div>
        `;
    }
    
    modal.style.display = 'block';
}

function formatOrderTime(dateObj) {
    if (!dateObj) return '';
    
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

function setupModal() {
    const modal = document.getElementById('order-modal');
    const closeBtn = document.getElementsByClassName('close-modal')[0];
    
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    };
    
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

function setupResizeHandler() {
    const handle = document.getElementById('resize-handle');
    const details = document.getElementById('details-panel');
    
    let startY;
    let startHeight;
    
    handle.addEventListener('mousedown', function(e) {
        startY = e.clientY;
        startHeight = parseInt(document.defaultView.getComputedStyle(details).height, 10);
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
        e.preventDefault();
    });
    
    function resize(e) {
        const newHeight = startHeight - (e.clientY - startY);
        if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
            details.style.height = newHeight + 'px';
        }
    }
    
    function stopResize() {
        document.removeEventListener('mousemove', resize);
    }
}

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM content loaded, initializing app");
    init();
    
    // Add active deliveries stat card if it doesn't exist
    if (!document.getElementById('activeDeliveries')) {
        const statsContainer = document.querySelector('.stats-container');
        if (statsContainer) {
            const activeDeliveriesCard = document.createElement('div');
            activeDeliveriesCard.className = 'stat-card';
            activeDeliveriesCard.innerHTML = `
                <div class="stat-icon"><i class="fas fa-motorcycle"></i></div>
                <div class="stat-info">
                    <div class="stat-value" id="activeDeliveries">0</div>
                    <div class="stat-label">Active Deliveries</div>
                </div>
            `;
            statsContainer.appendChild(activeDeliveriesCard);
        }
    }
    
    // Add CSS for enhanced animations
    addAnimationStyles();
});

// Add function to inject animation styles
function addAnimationStyles() {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        /* Enhanced Agent Marker Styles */
        .agent-marker {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 20px;
            position: relative;
            transition: all 0.3s ease;
            animation: float 2s infinite ease-in-out;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
        
        /* Delivery Effect Animation */
        .delivery-pulse {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            position: relative;
            opacity: 0.6;
            animation: delivery-pulse 1s ease-out;
        }
        
        @keyframes delivery-pulse {
            0% { transform: scale(0.5); opacity: 1; }
            100% { transform: scale(2.5); opacity: 0; }
        }
        
        /* Enhanced Order Number Styling */
        .order-number {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        
        /* Status Indicator Enhancements */
        .status {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 5px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.2px;
            transition: all 0.3s ease;
        }
        
        .status.pending {
            background-color: #fff3cd;
            color: #856404;
        }
        
        .status.approaching {
            background-color: #cce5ff;
            color: #004085;
            animation: blink 1s infinite;
        }
        
        .status.delivered {
            background-color: #d4edda;
            color: #155724;
        }
        
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        
        /* Animated Trail Effect for Routes */
        .animated-route {
            transition: all 0.3s ease;
        }
        
        /* Timeline Slider Enhancements */
        #simulation-timeline {
            height: 8px;
            background: #eee;
            border-radius: 4px;
            cursor: pointer;
            appearance: none;
            -webkit-appearance: none;
        }
        
        #simulation-timeline::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #4361ee;
            cursor: pointer;
            box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.3);
            transition: all 0.2s ease;
        }
        
        #simulation-timeline::-webkit-slider-thumb:hover {
            transform: scale(1.2);
        }
    `;
    document.head.appendChild(styleEl);
}
