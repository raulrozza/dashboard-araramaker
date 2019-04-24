/*
	Admin page functionalities file

	Author: Raul Rosá
	Created on: Tuesday, 23/04/2019

	Objetives:
		Contains the functionalities of the admin page. Most of them consists in making HTTP requests to the server regarding
		database information, and awaiting response

*/

/********************

	SCHEDULES

*******************/

const getSchedules = async function(){
	await axios.get('/schedules')
	.then(res => {
		if(!res.data.error){
			let startTime = 24, endTime = 1;
			let schedules = res.data.schedules;
			let weekDays = [ [], [], [], [], [], [], [] ];

			schedules.forEach((schedule) => {
				if(schedule.start_time < startTime)
					startTime = schedule.start_time;
				if(schedule.end_time > endTime)
					endTime = schedule.end_time;

				switch(schedule.weekDay.toLowerCase()){
					case 'monday':
						for(let i = schedule.start_time; i < schedule.end_time; i++)
							weekDays[1].push({time: i, open: schedule.open});
						break;
					case 'tuesday':
						for(let i = schedule.start_time; i < schedule.end_time; i++)
							weekDays[2].push({time: i, open: schedule.open});
						break;
					case 'wednesday':
						for(let i = schedule.start_time; i < schedule.end_time; i++)
							weekDays[3].push({time: i, open: schedule.open});
						break;
					case 'thursday':
						for(let i = schedule.start_time; i < schedule.end_time; i++)
							weekDays[4].push({time: i, open: schedule.open});
						break;
					case 'friday':
						for(let i = schedule.start_time; i < schedule.end_time; i++)
							weekDays[5].push({time: i, open: schedule.open});
						break;
					case 'saturday':
						for(let i = schedule.start_time; i < schedule.end_time; i++)
							weekDays[6].push({time: i, open: schedule.open});
						break;
					case 'sunday':
						for(let i = schedule.start_time; i < schedule.end_time; i++)
							weekDays[0].push({time: i, open: schedule.open});
						break;
					default:
						break;
				}
			});

			let tableHeader = getScheduleHeader();
			let columnHeader = getHourIntervals(startTime, endTime);

			fillScheduleTable(weekDays, tableHeader, columnHeader);
		}
	});
}

const fillScheduleTable = function(content, header, columnHeader){
	let scheduleTable = gId("schedule-table");

	//Add the table header
	let tHead = document.createElement('thead');
		let tHeadRow = document.createElement('tr');
			for(let i = 0; i < header.length; i++)
				tHeadRow.appendChild(addTh(header[i].date, 'col'));
		tHead.appendChild(tHeadRow);
	scheduleTable.appendChild(tHead);

	console.log(content);

	let tBody = document.createElement('tbody');
		columnHeader.forEach((hd) => {
			let tBodyRow = document.createElement('tr');
				tBodyRow.appendChild(addTh(hd.interval, 'row'));

				for(let i = 0; i < content.length; i++){
					let obj = content[i].find((obj) => {return obj.time == hd.startTime});
					let date = new Date();
					let tdClass = "";
					let notifications = null;
					if(date.getHours() >= hd.startTime && date.getDay() == header[i+1].day)
						tdClass = "bg-secondary"; //finished
					else if(obj === undefined)
						tdClass = "bg-danger"; //not exists
					else if(obj.open == 0)
						tdClass = "bg-danger"; //closed
					//Add the reserved color and notifications.
					tBodyRow.appendChild(addTd(tdClass, notifications));
				}
			tBody.appendChild(tBodyRow);
		});
	scheduleTable.appendChild(tBody);
}

/*******************

	UTILITIES

*******************/

Array.prototype.move = function (from, to) {
  this.splice(to, 0, this.splice(from, 1)[0]);
};

const getDateInStandard = function(date, dayOffset){
	let newDay = new Date();
	newDay.setDate(date.getDate() + (dayOffset ? dayOffset : 0));
	let dd = String(newDay.getDate()).padStart(2, '0');
	let mm = String(newDay.getMonth()+1).padStart(2, '0');

	return {date: dd + '/' + mm, day: dd };
}

const getScheduleHeader = function(){
	let today = new Date();
	let tableHeader = [{date: 'Horários', day: null }, {date: 'Hoje', day: today.getDay() }];
	for(let i = 1; i < 7; i++)
		tableHeader.push(getDateInStandard(today, i));
	return tableHeader;
}

const getHourIntervals = function(startTime, endTime){
	let intervals = [];
	for(let i = startTime; i < endTime; i++){
		intervals.push({interval:  `${i}:00 - ${i+1}:00`, startTime: i});
	}
	return intervals;
}

const addTh = function(text, scope){
	let th = document.createElement('th');
	th.scope = scope;
	th.appendChild(document.createTextNode(text));
	return th;
}

const addTd = function(tdClass, badge){
	let td = document.createElement('td');
	td.className += tdClass;
	if(badge){
		let span = document.createElement('span');
		span.className += "badge badge-light";
		span.appendChild(document.createTextNode(badge));
		td.appendChild(span);
	}

	return td;
}

/******************

	EVENTS

*******************/

window.addEventListener('load', ()=> {
	getSchedules();
});