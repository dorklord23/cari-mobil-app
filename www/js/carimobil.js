"use strict";

/*
 * <<DEPENDENCIES>>
 * AngularJS 1.4.8,
 * OnsenUI 1.3.14,
 * jQuery 2.1.4, and
 * Socket.IO
 *
 */

var cariMobil = ons.bootstrap('carimobil', ['onsen', 'ngCordova']),
    //socket = io.connect('http://192.168.43.127:8081', {'forceNew': true}),
    socket = io.connect('http://192.168.1.13:8081', {'forceNew': true}),
    //socket = io.connect('http://103.10.223.66:8081', {'forceNew': true}),
    orderStatus = ['OPEN', 'ACCEPTED', 'CANCELED', 'EXPIRED', 'COMPLETED', 'PICKED-UP', 'ARRIVED'],
    isConnected = false;
    
function logOut () {
    ons.notification.confirm({
            "title" : 'CONFIRMATION',
            "message": 'Do you want to log out?',
            "modifier": "material",
            "callback": function(idx) {
                switch (idx) {
                    // "CANCEL" button
                    case 0:
                        break;
                    // "OK" button
                    case 1:
                        localStorage.clear();
                        myNavigator.resetToPage('mainPage', {animation:'fade'})
                        console.log('Pre-disconnection socket ID', socket.id)
                        socket.io.disconnect()
                        socket.io.connect()
                        break;
                }
            }
        })
}

function logIn(serverReply) {
    // Login failed
    if (typeof serverReply === 'string') {
        alert(serverReply)
        return false
    }
    // Login successful
    else {
        for (var key in serverReply) {
            localStorage.setItem(key, serverReply[key])
        }
        myNavigator.resetToPage(localStorage.type + 'Page', {animation: 'fade'})
        
        // Resetting the form
        $('input[type="tel"]').val('')
        $('input[type="password"]').val('')
        
        loginFormModal.hide()
        console.log(localStorage)
    }
}

socket.on("connect", function() {
    console.log("Client Socket ID : %s", socket.id)
    $('.spinningCircle').css('background-color', 'green')
    isConnected = true
})

socket.on("disconnect", function() {
    socket.io.reconnect()
    $('.spinningCircle').css('background-color', 'red')
    isConnected = false
    
    /*ons.notification.alert({
        "title" : 'NOTIFICATION',       
        "message": "Disconnected from the server",
        "modifier": "material"
    })*/
})

socket.on("reconnect", function(localStorage) {
    socket.emit("reconnectToServer", localStorage, function(fromServer) {
        //
    })
    
    isConnected = true
    $('.spinningCircle').css('background-color', 'green')
    localStorage.setItem('socketID', socket.id)
    console.log("Client Socket ID Reconnected: %s", socket.id)
})

cariMobil.factory('sharedObjects', function () {
    // This is where variable, which is used across different controllers, is defined
    var sharedObjects = {
        passengerIcon : {
            url: "icon/passenger.png",
            scaledSize: new google.maps.Size(50, 50)
        },

        driverIcon : {
            url: "icon/carimobil72x72.png",
            scaledSize: new google.maps.Size(50, 50)
        }
    }

    return sharedObjects;
});

cariMobil.controller('splashscreenPageController', function($scope, $timeout, $rootScope) {
    ons.ready(function() {
        // You don't log in yet
        if (localStorage.type === undefined) {
            myNavigator.resetToPage('mainPage', {animation: 'fade'})
        }
        else {
            // Log in
            socket.emit(localStorage.type + 'LogIn', localStorage, logIn)
        }
        //myNavigator.resetToPage(localStorage.type + 'Page', {animation: 'fade'})
    
        document.addEventListener("deviceready", function () {
        // Enabling background mode
        cordova.plugins.backgroundMode.enable()
        
        // If background mode has been enabled and WebSocket has been connected to server
        if ( cordova.plugins.backgroundMode.isEnabled() /*&& isConnected*/ ) {
            // isConnected is true here
            
            // Notification when the app is in background mode
            cordova.plugins.backgroundMode.setDefaults({
                title:  'CariMobil',
                ticker: 'Faithfully waiting in the background',
                text:   'Faithfully waiting in the background'
            })
        }
        
        cordova.plugins.backgroundMode.onactivate = function() {}
        
        var serviceName = 'com.red_folder.phonegap.plugin.backgroundservice.CariMobil';
        var factory = cordova.require('com.red_folder.phonegap.plugin.backgroundservice.BackgroundService')
        var myService = factory.create(serviceName);
        
        serviceStartUp()
        
        function serviceStartUp() {
            myService.getStatus(function(r){displayResult(r)}, function(e){displayError(e)});
        }

        function displayResult(data) {
            if ( ! data.ServiceRunning) {
                myService.startService(function(r){displayResult(r)}, function(e){displayError(e)});
            }
            else {
                alert("Is service running: " + data.ServiceRunning);
            }
        }

        function displayError(data) {
            alert("We have an error");
        }

        }, false)

        $rootScope.beingBusy = false
        $rootScope.pointLatLong = {}
        $rootScope.markers = {}
    
    })
    /*ons.ready(function() {
        myNavigator.resetToPage('mainPage', {animation : 'fade'} )
        if (isConnected) {
            $('.spinningCircle').css('background-color', 'green')
        }
        else {
            $('.spinningCircle').css('background-color', 'red')
        }
    })*/
    /*
    // Chrome/Chromium-only!!
    if (Object.observe !== undefined) {
        // If google has changed already
        if (google !== {}) {
            myNavigator.pushPage('mainPage', {animation : 'fade'} )
        }
        else {
            Object.observe(google, function(changes) {
                myNavigator.pushPage('mainPage', {animation : 'fade'} )
            })
        }
    }
    // Firefox-only!!
    else if (window.watch !== undefined) {
        // If google has changed already
        if (google !== {}) {
            myNavigator.pushPage('mainPage', {animation : 'fade'} )
        }
        else {
            window.watch("google", function(id, old, cur) {alert()
                myNavigator.pushPage('mainPage', {animation : 'fade'} )
            })
        }
    }
    // Neither both of 'em. Safari, maybe? *shrugs*
    else {
        myNavigator.pushPage('mainPage', {animation : 'fade'} )
    }*/
})

// THIS IS WHERE THE USER CHOOSE WHAT WILL HE LOGS IN AS
cariMobil.controller('mainPageController', function($scope, $timeout, $rootScope, $cordovaLocalNotification) {
    //ons.createPopover('popover.html')
  //.then(function(popover) {
    //popover.show('#driverButton');
  //});
    $scope.changeServer = function() {
        socket.io.disconnect()
        socket = io.connect($('#serverAddress').val(), {'forceNew': true})
        socket.io.connect()
        serverAddressModal.hide()
    }
    
    ons.ready(function() {
        if (isConnected) {
            $('.spinningCircle').css('background-color', 'green')
        }
        else {
            $('.spinningCircle').css('background-color', 'red')
        }
    })
    /*
    document.addEventListener("deviceready", function () {
        // Enabling background mode
        cordova.plugins.backgroundMode.enable()
        
        // If background mode has been enabled and WebSocket has been connected to server
        if ( cordova.plugins.backgroundMode.isEnabled() /*&& isConnected* ) {
            // isConnected is true here
            
            // Notification when the app is in background mode
            cordova.plugins.backgroundMode.setDefaults({
                title:  'CariMobil',
                ticker: 'Faithfully waiting in the background',
                text:   'Faithfully waiting in the background'
            })
        }
        
        cordova.plugins.backgroundMode.onactivate = function() {}
    }, false)
        
    switch (localStorage.type) {
        case 'passenger':
            $('#driverButton').prop('disabled', true)
            break
        case 'driver':
            $('#passengerButton').prop('disabled', true)
            break
        default:
            $('#passengerButton').prop('disabled', false)
            $('#driverButton').prop('disabled', false)
    }

    $rootScope.beingBusy = false
    $rootScope.pointLatLong = {}
    $rootScope.markers = {}
    */
});

cariMobil.controller('signupFormController', function($scope, $timeout, $rootScope, sharedObjects) {
    $scope.userName = ''
    $scope.userPhoneNumber = ''
    $scope.password = ''
    $scope.confirmPassword = ''
    
    
    // Resetting to default properties
    //$('#userSignUp').prop('disabled', true).html('Acquiring your position...')
    
    $scope.userSignUp = function() {
        if ( $scope.userName === '' || $scope.userPhoneNumber === '' || $scope.password === '' || $scope.confirmPassword === '' ) {
            alert('Every fields must be filled')
            return false
        }
        
        if ( $scope.password !== $scope.confirmPassword ) {
            alert('Please confirm the password you supplied is same with the one you want')
            return false
        }
        
        /*switch ($rootScope.currentSignUpForm) {
            case 'driver':xxx
                var userDataToUse = $rootScope.driverData
                break
            case 'passenger':
                var userDataToUse = $rootScope.passengerData
                break
        }*/
        
        var userDataToUse = {}
        
        userDataToUse.name = $scope.userName//$('#userName').val()
        userDataToUse.phoneNumber = $scope.userPhoneNumber//$('#userPhoneNumber').val()
        userDataToUse.password = $scope.password
        userDataToUse.type = $('input:checked').val()
        
        socket.emit($('input:checked').val() + "SignUp", userDataToUse, function(serverReply) {
            // Resetting the form
            $('input[type="text"]').val('')
            $('input[type="tel"]').val('')
            $('input[type="password"]').val('')
    
            signupFormModal.hide()
            socket.on('userHasBeenRegistered', function(registeredUserData) {
                for (var key in registeredUserData) {
                    localStorage.setItem(key, registeredUserData[key])
                }
                console.log('localStorage after register', localStorage)
            })
            // After successfully signs up, the driver proceeds to wait until a passenger is found
        })
    }
    
    $scope.cancelSignup = function() {
        signupFormModal.hide()
    }
})

cariMobil.controller('loginFormController', function($scope, $timeout, $rootScope, sharedObjects) {
    $scope.userPhoneNumber = ''
    $scope.password = ''
    
    $scope.logIn = function() {
        if ( $scope.userPhoneNumber === '' || $scope.password === '' ) {
            alert('Every fields must be filled')
            return false
        }
        if ($('input:checked').val() === undefined) {
            alert('You must choose what type of user you\'ll login as')
            return false
        }
        
        var loginData = {
            phoneNumber : $scope.userPhoneNumber,
            password : $scope.password,
            type : $('input:checked').val()
        }
        
        socket.emit($('input:checked').val() + 'LogIn', loginData, logIn)
    }
})

// WHERE THE DRIVER WAITS FOR THE PASSENGER
cariMobil.controller('driverPageController', function($scope, $timeout, $rootScope, $cordovaLocalNotification, sharedObjects) {
    $scope.logOut = logOut
    
    if (isConnected) {
        $('.spinningCircle').css('background-color', 'green')
    }
    else {
        $('.spinningCircle').css('background-color', 'red')
    }
        
    //console.log('localStorage ', localStorage)
    // If you didn't login yet (localStorage.type === undefined)
    //                               OR
    // you're not logged in as driver (localStorage.type !== driver) */
    /*if (localStorage.type === undefined || localStorage.type !== 'driver') {
        // Registration form
        signupFormModal.show()
    }
    else {
        // Log in
        
        socket.emit('driverLogIn', localStorage, logIn)
        //console.log('localStorage ', localStorage)
    }*/
    
    // Empty the input boxes and set focus on the first one
    $('#userName').val('').focus()
    $('#userPhoneNumber').val('')
    
    $rootScope.currentSignUpForm = 'driver'
    
    
    // And a passenger is found
    socket.on("passengerFound", function(pickUpOrder) {
        // Only one order could be reviewed at a time
        if ($rootScope.beingBusy) {
            // Reject any new order as long as the driver's currently taking one
            return false
        }

        $rootScope.pickUpOrder = pickUpOrder
        myNavigator.pushPage('pickUpOrderPage', {animation : 'lift'} )
        
        if ( cordova.plugins.backgroundMode.isActive() ) {
            var notifikasi = {
                'id' : 1,
                'title' : 'CariMobil',
                'text' : "You've got an order!!",
            }
            
            $cordovaLocalNotification.schedule(notifikasi)
        }
    })
    
    $timeout(function() {
        function success(position) {
            var latitude  = position.coords.latitude,
                longitude = position.coords.longitude;
            
            $rootScope.driverData = {
                "socketID" : socket.id,//Math.random().toString(36).substr(2, 5),
                "lat" : latitude,//-6.3,
                "lng" : longitude,//107.4,
                "name" : "",
                "phoneNumber" : "",
                "ipAddress" : "",
                'type' : 'driver',
                'status' : 'CONNECTED'
            };
            
            // Enabling user signup button only after GPS works successfuly
            //$('#userSignUp').prop('disabled', false).html('Sign Up')
        }

        function error() {
            //Try to locate your position one more time
            navigator.geolocation.getCurrentPosition(success, function() {
                alert("Still unable to retrieve your location. Have you turned on your GPS?");
            }, {"timeout": 60000, "enableHighAccuracy" : true});
        }

        navigator.geolocation.getCurrentPosition(success, error, {"timeout": 5000, "enableHighAccuracy" : true});
    }, 200)
})

// FOR THE DRIVER TO REVIEW AN INCOMING ORDER AND DECIDE WHETHER TO ACCEPT OR IGNORE IT
cariMobil.controller('pickUpOrderPageController', function($scope, $timeout, $rootScope, sharedObjects) {
    if (isConnected) {
        $('.spinningCircle').css('background-color', 'green')
    }
    else {
        $('.spinningCircle').css('background-color', 'red')
    }
    
    $('#reachTheDriver').hide()
    $('#pickPassengerUp').hide()
    $('#arrivedAtDestination').hide()
    
    // Telling the client that you're busy reviewing an order.
    // As long as you don't ignore it, you can't accept another one
    $rootScope.beingBusy = true
    
    $scope.ignoreOrder = function() {
        $rootScope.beingBusy = false
        myNavigator.popPage()
    }
    
    $scope.acceptOrder = function() {
        // Updating the order with the accepting driver's ID
        //alert('driverID ', localStorage.id, ' is a ', typeof localStorage.id)
        console.log($rootScope.pickUpOrder.driverID, ' = ', parseInt( localStorage.id ))
        $rootScope.pickUpOrder.driverID = parseInt( localStorage.id )
        $rootScope.pickUpOrder.driverLat = $rootScope.driverData.lat
        $rootScope.pickUpOrder.driverLng = $rootScope.driverData.lng
        
        //driverID dah ada di sini
        console.log('$rootScope.pickUpOrder ', $rootScope.pickUpOrder)
            
        // Tell the server that the order is accepted
        socket.emit("orderAccepted", $rootScope.pickUpOrder, function(serverReply) {
            console.log("orderAccepted ", $rootScope.pickUpOrder)
            
            if (serverReply === "ACCEPTED") {
                ons.notification.alert({
                    "title" : 'NOTIFICATION',       
                    "message": "The order is already taken by someone else",
                    "modifier": "material",
                    "callback": function(idx) {
                        $rootScope.beingBusy = false
                        // Back to the waiting page
                        myNavigator.popPage()
                    }
                })
            }
        })

        $('#reachTheDriver').show()
        $("#orderConsideration").hide()
            
        $('#pickPassengerUp').show().one("click", function() {
            $(this).hide()
            socket.emit("passengerIsPickedUp", $rootScope.pickUpOrder)
            console.log('picked up order', $rootScope.pickUpOrder)

            $('#arrivedAtDestination').show().one("click", function() {
                socket.emit("passengerHasArrived", $rootScope.pickUpOrder)
                console.log('arrived order', $rootScope.pickUpOrder)
                
                // Now you could receive other orders
                $rootScope.beingBusy = false
            })
        })
    }//)
        
    window.navigator.vibrate([1000, 300, 1000, 1000, 300, 1000, 1000, 300, 1000, 1000, 300, 1000, 1000, 300, 1000])
                    
    ons.notification.alert({
        "title" : 'NOTIFICATION',       
        "message": "A passenger asked to be picked up",// + passengerData.clientID,
        "modifier": "material",
        "callback": function(idx) {
            window.navigator.vibrate(0)
        }
    })
    
    $timeout(function() {
        var driverLatLong = new google.maps.LatLng($rootScope.driverData.lat, $rootScope.driverData.lng);

        var mapOptions = {
            "zoom" : 15,
            "center" : driverLatLong,
            "mapTypeId" : google.maps.MapTypeId.ROADMAP
        };

        // Displaying the map
        var map = new google.maps.Map(document.getElementById("driverPage_map"), mapOptions)

        // Your position on the map
        var driverMarker = new google.maps.Marker({
            "position" : driverLatLong,
            "icon" : sharedObjects.driverIcon,
            "map" : map,
            "title" : "You're Here!!"
        });

        var passengerLatLong = new google.maps.LatLng($rootScope.pickUpOrder.start.lat, $rootScope.pickUpOrder.start.lng)
                    
        var passengerMarker = new google.maps.Marker({
            "position" : passengerLatLong,
            "icon" : sharedObjects.passengerIcon,
            "map" : map,
            "title" : "The passenger is here!!"
        });

        var directionsService = new google.maps.DirectionsService(),
            directionsDisplay = new google.maps.DirectionsRenderer(),
            distanceMatrixService = new google.maps.DistanceMatrixService();

        distanceMatrixService.getDistanceMatrix({
            origins: [driverLatLong],
            destinations: [passengerLatLong],
            travelMode: google.maps.TravelMode.DRIVING
        }, callback);

        function callback(response, status) {
            console.log("response %o", response)
    
            $("#passengerName").html($rootScope.pickUpOrder.name)
            $("#passengerPhoneNumber").html($rootScope.pickUpOrder.phoneNumber)
            $("#passengerPickUpPoint").html($rootScope.pickUpOrder.start.text)
            $("#passengerDestinationPoint").html($rootScope.pickUpOrder.finish.text)
            $("#passengerMessage").html($rootScope.pickUpOrder.message)
            $("#passengerDistance").html(response.rows[0].elements[0].distance.text)
            $("#passengerETA").html(response.rows[0].elements[0].duration.text)

            $("#callPassenger").attr("href", "tel:" + $rootScope.pickUpOrder.phoneNumber)
            $("#smsPassenger").attr("href", "sms:" + $rootScope.pickUpOrder.phoneNumber)
        }

        var request = {
            origin: driverLatLong,
            destination: passengerLatLong,
            travelMode: google.maps.TravelMode.DRIVING
        };

        directionsService.route(request, function (response, status) {
            if (status === google.maps.DirectionsStatus.OK) {
                directionsDisplay.setDirections(response);
                directionsDisplay.setMap(map);
            } else {
                alert("Directions Request from " + driverLatLong.toUrlValue(6) + " to " + passengerLatLong.toUrlValue(6) + " failed: " + status);
            }
        });
    }, 200)
});

// WHERE THE PASSENGER FILLS UP HIS ORDER DETAIL
cariMobil.controller('passengerPageController', function($scope, $timeout, sharedObjects, $rootScope) {
    $scope.logOut = logOut
    
    $scope.determineLocation = function(point) {
        myNavigator.pushPage('locationSearchPage', {animation : 'lift'} )
        $rootScope.locationDetail = point
    }
    
    //ons.ready(function() {
        if (isConnected) {
            $('.spinningCircle').css('background-color', 'green')
        }
        else {
            $('.spinningCircle').css('background-color', 'red')
        }
    //})
    
    console.log('localStorage ', localStorage)
    
    /*if (localStorage.type === undefined || localStorage.type !== 'passenger') {
        // User registration
        signupFormModal.show()
    } else{
        // Log in
        //localStorage.socketID = socket.id
        socket.emit('passengerLogIn', localStorage, logIn)
        //console.log('localStorage ', localStorage)
    }*/
    
    // Empty the input boxes and set focus on the first one
    $('#userName').val('').focus()
    $('#userPhoneNumber').val('')
    
    $scope.pickUpPoint = ''
    $scope.destinationPoint = ''
    
    $rootScope.currentSignUpForm = 'passenger'
    
    $('#tripEstimationResult').hide()
    
    $scope.submitOrder = function() {
        // if either pickUpPoint or destinationPoint is empty, then display alert box and ends the operation
        if ( $('#pickUpPoint').val() === '' || $('#destinationPoint').val() === '' ) {
            ons.notification.alert({
                "title" : 'ALERT',
                "message": 'Both Pickup Point and Destination Point must be filled',
                "modifier": "material"
            })

            return false;
        }

        ons.notification.confirm({
            "title" : 'CONFIRMATION',
            "message": 'Are you sure you want to continue?',
            "modifier": "material",
            "callback": function(idx) {
                switch (idx) {
                    // "CANCEL" button
                    case 0:
                        break;

                    // "OK" button
                    case 1:
                        // Preparing coordinates to be sent
                        $rootScope.pickUpOrder = {
                            "socketID" : socket.id,// The passenger's socket ID
                            // _id was meant to be an order's ID and it's acquired from server
                            // but it changes for every transaction so it's not reliable
                            'id' : '',
                            "passengerID" : parseInt(localStorage.id),// Ambil dari local/sessionStorage aja
                            "driverID" : '',
                            "name" : localStorage.name, // The passenger's name
                            "phoneNumber" : localStorage.phoneNumber, // And his/her phone number
                            
                            "start" : {
                                "text" : $('#pickUpPoint').val(),
                                "lat" : parseFloat( $('#pickUpPointLat').val() ),
                                "lng" : parseFloat( $('#pickUpPointLng').val() )
                            },
                            
                            "finish" : {
                                "text" : $('#destinationPoint').val(),
                                "lat" : parseFloat( $('#destinationPointLat').val() ),
                                "lng" : parseFloat( $('#destinationPointLng').val() )
                            },
                            
                            // The feedback will be filled after the passenger has arrived at his/her destination
                            'feedback' : {
                                'title' : '',
                                'content' : '',
                                'value' : {
                                    'numeral' : 0,
                                    'text' : ''
                                }
                            },
                            
                            // The timestamps will be filled when the order has been sent to server
                            "timestamp" : "",
                            "pickedUpTime" : "",
                            "arrivalTime" : "",
                            "message" : $('#messageForDriver').val(),
                            "type" : 'order',
                            "status" : "OPEN"
                        }
                        
                        // Sending the order to the server
                        socket.emit("submitOrder", $rootScope.pickUpOrder, function(serverReply) {
                            console.log('$rootScope.pickUpOrder ', $rootScope.pickUpOrder)
                            $rootScope.pickUpOrder = serverReply
                        })
                        
                        myNavigator.pushPage('foundDriverPage', { animation : 'slide' } )
                        break;
                }
            }
        })
    }

    // Passenger looks for a driver
    $timeout(function() {
        // openedPage based on <ons-template>'s id attribute
        //var openedPage = event.enterPage.name;

        function success(position) {
            var latitude  = position.coords.latitude,
                longitude = position.coords.longitude;

            var latLong = new google.maps.LatLng(latitude, longitude);

            var mapOptions = {
                "zoom" : 15,
                "center" : latLong,
                "mapTypeId" : google.maps.MapTypeId.ROADMAP
            };

            // Displaying the map
            var map = new google.maps.Map(document.getElementById("passengerPage_map"), mapOptions);

            // Your position on the map
            var passengerMarker = new google.maps.Marker({
                "position" : latLong,
                "icon" : sharedObjects.passengerIcon,
                "map" : map,
                "title" : "You're Here!!"
            });

            // The passenger
            $rootScope.passengerData = {
                "id" : null,
                "socketID" : socket.id,//Math.random().toString(36).substr(2, 5),
                "lat" : latitude,
                "lng" : longitude,
                "name" : "",
                "phoneNumber" : "",
                "ipAddress" : "",
                "orders" : {},
                'type' : 'passenger',
                'status' : 'CONNECTED'
            };

            // After logging in, fetch __ALL__ online drivers' data from the server and display their locations on the map                    
            socket.emit("driversDataFetch", {}, function(driverDataFromServer) {
                if (driverDataFromServer === []) {
                    // No drivers are currently online
                    alert('No drivers are currently online')
                    return false
                }
                
                var driverMarkers = []

                for (var i in driverDataFromServer) {
                    driverMarkers[i] = new google.maps.Marker({
                        "position" : new google.maps.LatLng(driverDataFromServer[i].lat, driverDataFromServer[i].lng),
                        "icon" : sharedObjects.driverIcon,
                        "map" : map,
                        "title" : "Driver #" + (i + 1)
                    });
                }
            })

            // Enabling user signup button only after GPS works successfuly
            //$('#userSignUp').prop('disabled', false).html('Sign up')
        }

        function error() {
            //Try to locate your position one more time
            navigator.geolocation.getCurrentPosition(success, function() {
                alert("Still unable to retrieve your location. Have you turned on your GPS?");
            }, {"timeout": 60000, "enableHighAccuracy" : true})
        };

        navigator.geolocation.getCurrentPosition(success, error, {"timeout": 5000, "enableHighAccuracy" : true});
    }, 200);
});

// AFTER THE PASSENGER ORDERS A DRIVER, WE'RE LOOKING FOR ONE AND DISPLAY HIS PROFILE AND POSITION
cariMobil.controller('foundDriverController', function($scope, $timeout, $rootScope, $cordovaLocalNotification, sharedObjects) {
    if (isConnected) {
        $('.spinningCircle').css('background-color', 'green')
    }
    else {
        $('.spinningCircle').css('background-color', 'red')
    }
    
    driverSearchModal.show();
    
    // You (the passenger) have arrived at destination
    socket.on("youHaveArrived", function() {
        // FYI
        // myNavigator.getCurrentPage().name === 'foundDriverPage'

        if ( $rootScope.isFeedbackOpen ) {
            // idk why, but event youHaveArrived is fired twice after first order
            // So this is to prevent it fired twice
            return false
        }
        myNavigator.pushPage('passengerFeedbackPage', {animation : 'lift'} )
        
        // Sometimes the passenger doesn't receive driverAccepts event so driverSearchModal.hide() 
        // must be called again afterward to make driverSearchModal hides
        driverSearchModal.hide()
        
        $rootScope.isFeedbackOpen = true
    })

    $timeout(function() {
        function success(position) {
            var latLong = $rootScope.pointLatLong["pickUpPoint"]

            var mapOptions = {
                "zoom" : 15,
                "center" : latLong,
                "mapTypeId" : google.maps.MapTypeId.ROADMAP
            };

            // Displaying the map
            var map = new google.maps.Map(document.getElementById("driverToPassenger_map"), mapOptions);

            // Your position on the map
            var passengerMarker = new google.maps.Marker({
                "position" : latLong,
                "icon" : sharedObjects.passengerIcon,
                "map" : map,
                "title" : "You're here!!"
            });

            socket.on("driverAccepts", function(acceptingDriver) {
                driverSearchModal.hide()
                console.log('A driver accepts the order %o', acceptingDriver)
                
                // Your driver's position on the map
                var driverLatLong = new google.maps.LatLng(acceptingDriver.lat, acceptingDriver.lng);

                var driverMarker = new google.maps.Marker({
                    "position" : driverLatLong,
                    "icon" : sharedObjects.driverIcon,
                    "map" : map,
                    "title" : "Your driver is here!!"
                });

                var directionsService = new google.maps.DirectionsService(),
                    directionsDisplay = new google.maps.DirectionsRenderer(),
                    distanceMatrixService = new google.maps.DistanceMatrixService();

                distanceMatrixService.getDistanceMatrix({
                    // origins and destinations must be an array
                    origins: [driverLatLong],
                    destinations: [latLong],
                    travelMode: google.maps.TravelMode.DRIVING
                    //transitOptions: TransitOptions,
                    //drivingOptions: DrivingOptions, mesti punya Google Maps API for Work client ID
                    //unitSystem: UnitSystem, it's metric by default
                    //avoidHighways: Boolean, //  looks like it's false by default
                    //avoidTolls: Boolean, //  looks like it's false by default
                }, callback1);

                function callback1(response, status) {
                    console.log("response %o", response)
                    
                    $("#driverName").html(acceptingDriver.name)
                    $("#driverPhoneNumber").html(acceptingDriver.phoneNumber)
                    //$("#driverLocation").html(response.originAddresses[0])
                    $("#driverDistance").html(response.rows[0].elements[0].distance.text)
                    $("#driverETA").html(response.rows[0].elements[0].duration.text)

                    $("#callDriver").attr("href", "tel:" + acceptingDriver.phoneNumber)
                    $("#smsDriver").attr("href", "sms:" + acceptingDriver.phoneNumber)
                    
                    // Notify the passenger if the app's in background mode
                    if ( cordova.plugins.backgroundMode.isActive() ) {
                        $cordovaLocalNotification.schedule({
                            'id' : 2,
                            'title' : 'CariMobil',
                            'text' : "We've found you a driver!!"
                        })
                    }
                }

                var request = {
                    origin: driverLatLong,
                    destination: latLong,
                    travelMode: google.maps.TravelMode.DRIVING
                };

                directionsService.route(request, function (response, status) {
                    if (status === google.maps.DirectionsStatus.OK) {
                        directionsDisplay.setDirections(response);
                        directionsDisplay.setMap(map);
                    }
                    else {
                        driverSearchModal.hide()
                        
                        ons.notification.alert({
                            "title" : 'ERROR',       
                            "message": "Directions Request from " + driverLatLong.toUrlValue(6) + " to " + latLong.toUrlValue(6) + " failed: " + status,
                            "modifier": "material",
                            'callback' : function(id) {
                                myNavigator.popPage()
                            }
                        })
                    }
                })

                console.log("getDriver %o", acceptingDriver)
            })
        }

        function error() {
            //Try to locate your position one more time
            navigator.geolocation.getCurrentPosition(success, function() {
                alert("Failed to retrieve your location. Have you turned on your GPS?");
            }, {"timeout": 60000, "enableHighAccuracy" : true});
        };

        navigator.geolocation.getCurrentPosition(success, error, {"timeout": 5000, "enableHighAccuracy" : true});

    }, 200)
})

cariMobil.controller('passengerFeedbackController', function($scope, $timeout, $rootScope, sharedObjects) {
    if (isConnected) {
        $('.spinningCircle').css('background-color', 'green')
    }
    else {
        $('.spinningCircle').css('background-color', 'red')
    }
    
    $scope.feedBackTitle = ''
    $scope.feedBackContent = ''
    $scope.feedBackValue = 3
    $scope.explanation = {
        1 : "Lame", 2 : "Below Average", 3 : "Standard", 4 : "Good", 5 : "Excellent"
    }
    
    $scope.submitFeedBack = function() {
        $scope.feedBackValueText = $scope.explanation[$scope.feedBackValue]

        var feedBack = {
            title : $scope.feedBackTitle,
            content : $scope.feedBackContent,
            value : {
                numeral : $scope.feedBackValue,
                text : $scope.feedBackValueText
            }
        }
        
        socket.emit("submitFeedBack", feedBack, function(serverReply) {
            $rootScope.isFeedbackOpen = false
            // Returns to the first page
            myNavigator.resetToPage('passengerPage')
        })
    }
})

// Search for a place to wait or go to
cariMobil.controller('locationSearchController', function($scope, $timeout, sharedObjects, $rootScope) {
    if (isConnected) {
        $('.spinningCircle').css('background-color', 'green')
    }
    else {
        $('.spinningCircle').css('background-color', 'red')
    }
    
    $("#placeToSearch").focus()
    
    $timeout(function() {
        function success(position) {
            var latitude  = position.coords.latitude,
                //ckpHomePosition = {"lat" : -6.3925354, "lng" : 107.4840291},
                longitude = position.coords.longitude;

            var latLong = new google.maps.LatLng(latitude, longitude);

            var mapOptions = {
                "zoom" : 15,
                "center" : latLong,
                "mapTypeId" : google.maps.MapTypeId.ROADMAP
            };

            // This map is just to be an argument for google.maps.places.PlacesService instantiation
            // So it doesn't have to be displayed
            var map = new google.maps.Map(document.getElementById("map"), mapOptions);

            var placesService = new google.maps.places.PlacesService(map);
            
            function callback(results, status) {
                // alert(results[0].name + "\n" + results[0].formatted_address)
                // The places could be marked on the map with createMarker(results[i]);
                for (var i = 0; i < results.length; i++) {
                    $("#searchResultList").append(//<div style="border-bottom-width:thin; border-style:outset; padding: 0.3em">
                        '<ons-list-item modifier="tappable"><ons-button><div font-weight:bold">' +
                        results[i].name + '</div><p>' + results[i].formatted_address + // this is nth-child(2)
                        '</p><input type="hidden" class="latitude" value="' + results[i].geometry.location.lat() + '">' +
                        '<input type="hidden" class="longitude" value="' + results[i].geometry.location.lng() + '">' +'</ons-button></ons-list-item>')
                }

                $('ons-list-item ons-button').click(function() {
                    // If you click one of the location search results, the address and coordinates will be 
                    // transferred to previous page (Passenger page)
                    
                    // Return to the so-called previous page
                    myNavigator.popPage()
                    
                    // locDtl value could be either 'pickUpPoint' or 'destinationPoint'
                    var locDtl = $rootScope.locationDetail
                    
                    // Transfer the aforementioned values (address and coordinates)
                    $("#" + locDtl).val( $(this).children(':nth-child(1)').html() )
                    $("#" + locDtl + "Lat").val( $(this).children(':nth-child(3)').val() )
                    $("#" + locDtl + "Lng").val( $(this).children(':nth-child(4)').val() )

                    // Determine the pickup point OR destination point location on the map
                    $rootScope.pointLatLong[locDtl] = new google.maps.LatLng(
                        parseFloat( $(this).children(':nth-child(3)').val() ),
                        parseFloat( $(this).children(':nth-child(4)').val() )
                    );

                    var mapOptions = {
                        "zoom" : 15,
                        "center" : $rootScope.pointLatLong[locDtl],
                        "mapTypeId" : google.maps.MapTypeId.ROADMAP
                    };

                    // Displaying the map
                    if ($rootScope.routeMap === undefined) {
                        $rootScope.routeMap = new google.maps.Map(document.getElementById("passengerPage_map"), mapOptions)
                    }
                    else {
                        $rootScope.routeMap.setCenter($rootScope.pointLatLong[locDtl])
                    }

                    var marker = new google.maps.Marker({
                        "position" : $rootScope.pointLatLong[locDtl],
                        //"icon" : sharedObjects.passengerIcon,
                        "map" : $rootScope.routeMap,
                        "title" : locDtl
                    });
                    
                    if ( ! ($rootScope.markers[locDtl] === undefined) ) {
                        $rootScope.markers[locDtl].setMap(null)
                        //$rootScope.pointLatLong[locDtl]
                    }

                    $rootScope.markers[locDtl] = marker
                    
                    // These codes are only executed if both pickup point and destination are already supplied
                    var directionsService = new google.maps.DirectionsService(),
                        directionsDisplay = new google.maps.DirectionsRenderer(),
                        distanceMatrixService = new google.maps.DistanceMatrixService();

                    distanceMatrixService.getDistanceMatrix({
                        // origins and destinations must be an array
                        origins: [$rootScope.pointLatLong.pickUpPoint],
                        destinations: [$rootScope.pointLatLong.destinationPoint],
                        travelMode: google.maps.TravelMode.DRIVING
                    }, tripEstimationResult);

                    function tripEstimationResult(response, status) {
                        $('#tripEstimationResult').show()
                        $("#tripDistance").html(response.rows[0].elements[0].distance.text)
                        $("#tripDuration").html(response.rows[0].elements[0].duration.text)
                    }

                    var request = {
                        origin: $rootScope.pointLatLong.pickUpPoint,
                        destination: $rootScope.pointLatLong.destinationPoint,
                        travelMode: google.maps.TravelMode.DRIVING
                    };

                    directionsService.route(request, function (response, status) {
                        if (status === google.maps.DirectionsStatus.OK) {
                            directionsDisplay.setDirections({routes: []});
                            directionsDisplay.setDirections(response);
                            // Resetting the map from previous route
                            //directionsDisplay.setMap(null);
                            // And then setting the new one
                            directionsDisplay.setMap($rootScope.routeMap);
                            directionsDisplay.setOptions( { suppressMarkers: true } );
                        } else {
                            alert("Directions Request from " + pointLatLong['pickUpPoint'].toUrlValue(6) + " to " + pointLatLong['destinationPoint'].toUrlValue(6) + " failed: " + status);
                        }
                    });
                })
                
                console.log("Results : %o", results)
                console.log("Status : %o", status)
            }

            $("#placeToSearch").change(function() {
                $("#searchResultList").html('')
                console.log("Begin searching...")
                var request = { query : $(this).val() };
                placesService.textSearch(request, callback);
            });
        }

        function error() {
            alert("Failed in initializing search base")
        }

        navigator.geolocation.getCurrentPosition(success, error, {"timeout": 5000, "enableHighAccuracy" : true});
    }, 200)
})

/*
function storageAvailable(type) {
	try {
		var storage = window[type],
			x = '__storage_test__';
		storage.setItem(x, x);
		storage.removeItem(x);
		return true;
	}
	catch(e) {
		return false;
	}
}
var loc = '', ses = '';
if (storageAvailable('localStorage')) {
	loc = "localStorage is available"
}
if (storageAvailable('sessionStorage')) {
	ses = "sessionStorage is available"
}
alert(loc + "\n" + ses)
*/
