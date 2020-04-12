"use strict";

//declare const SVG: any;
//declare const $: any;

window.onload = function()
{
	//-------------Global Variables---------------//

	//Grid Variable
	const View = SVG.get('View').panZoom(false);

	//List Variable
	const ChildNodes = $("#List")[0].childNodes;
	const NodesToArray = Array.prototype.slice.call(ChildNodes);

	//Svg Variable
	const MainGroup = View.group().id("MainGroup");
	const PathGroup = View.group().id("PathGroup");
	const FurnitureGroup = View.group().id("FurnitureGroup").addTo(MainGroup);
	const CircleClass = ["LeftTop", "LeftBottom", "Left", "RightTop", "RightBottom", "Right", "LeftTop", "RightTop", "Top", "LeftBottom", "RightBottom", "Bottom"];

	const Selected = { Rect:null };

	//Position Variable
	const Displacements = {x:0,y:0};

	//Zoom Variable
	let MouseDetect = false;

	//Enable Variables
	const Enables = { GridMove: true };
	//-------------Grid Functions---------------//

	$(function SlidingGrid()
	{
		$("body").on("mousedown", "#Pattern", true, function(event)
		{
			if($("#MouseMovement").is(":checked") && Enables.GridMove == true)
			{
				View.panZoom(false);

				let ViewBoxX = View.viewbox().x, ViewBoxY = View.viewbox().y, ViewBoxW = View.viewbox().width, ViewBoxH = View.viewbox().height;
				let StartX = event.pageX, StartY = event.pageY;

				$(document).on("mousemove", function(event)
				{
					let x = (ViewBoxX - (event.pageX - StartX)/ View.zoom());
					let y = (ViewBoxY - (event.pageY - StartY)/ View.zoom());

					View.viewbox({x: x, y: y, width: ViewBoxW, height: ViewBoxH});
				});
			}
		})
		$(document).on("mouseup", function(){ $(document).off("mousemove"); });
	})

	$(function DisableZoom()
	{
		$(document).on("keydown", function(event)
		{
			if (event.ctrlKey == true && (event.which == 61 || event.which == 107 || event.which == 173 || event.which == 109  || event.which == 187  || event.which == 189  ) )
			{
				event.preventDefault();
			}
		});

		$(window).bind('mousewheel DOMMouseScroll', function (event)
		{
			$("body").on("mousedown", function(){MouseDetect=true});

			if(MouseDetect == false)
			{
				event.preventDefault();
				View.panZoom({zoomMin: 0.1, zoomMax: 5, zoomFactor: 0.1});

				$(window).on("mousewheel", function()
				{
					$("#Zoom").val(View.zoom());

					clearTimeout($.data(this, 'timer'));

					$.data(this, 'timer', setTimeout(function()
					{
						View.panZoom(false);
					}, 1000));
				});
			}
			$("body").on("mouseup", function(){MouseDetect=false});
		});
	})

	$(function Zoom()
	{
		$("#Zoom").on("input", function()
		{
			let WindowWidth = window.innerWidth;
			let WindowHeight = window.innerHeight;

			View.zoom($(this).val(), {x:WindowWidth,y:WindowHeight})
		})
	})

	//-------------Move Element---------------//

	$(function MoveElement()
	{
		$("body").on("mousedown", ".Move", function(event)
		{
			if($("#MouseMovement").is(":checked"))
			{
				Selected.Rect = this;
				UpdateResIn(this.instance);

				let Rect = this.instance, RectGroup = Rect.parent(".DragRectGroup");
				let GetTransform = RectGroup.transform();

				Displacements.x = Rect.transform().x, Displacements.y = Rect.transform().y;

				//Function for create rotation
				SetRotationCircle(Rect);

				const StartPosition = { StartX: event.clientX, StartY: event.clientY };
				const CurrentPosition = { x: 0, y: 0 };

				$(document).on("mousemove", function(event)
				{
					UpdateResIn(Rect);

					CurrentPosition.x = parseInt(GetTransform.x) + (event.clientX - StartPosition.StartX) / View.zoom();
					CurrentPosition.y = parseInt(GetTransform.y) + (event.clientY - StartPosition.StartY) / View.zoom();

					RectGroup.transform({ x: CurrentPosition.x, y: CurrentPosition.y })
				});
				$("body").off("mouseup").on("mouseup", function(){ $(document).off("mousedown");  });
			}
		});
	});

	$(function MultipleSelection()
	{
		$("#Pattern").on("mousedown", function(event)
		{
			if($("#MouseSelection").is(":checked"))
			{
				const Viewport = SVG.get("View").viewbox();

				const Sx = event.clientX, Sy = event.clientY;
				const MultiSelection = View.rect(0,0).cx(Sx/View.zoom()+Viewport.x).cy(Sy/View.zoom()+Viewport.y).fill("transparent").stroke({color: "black", opacity: 1, width: 3}).attr("id","SelectionRectangle");

				$("body").on("mousemove", function(event)
				{
					let x = (event.clientX - Sx) / View.zoom(), y = (event.clientY - Sy) / View.zoom(), Ox, Oy, Width, Height;

					if(x < 0) { Width = -x; Ox = x; }else{ Width = x; Ox = 0; }
					if(y < 0) { Height = -y; Oy = y; }else{ Height = y; Oy = 0; }

					MultiSelection.size(Width, Height).translate(Ox, Oy);

					const RectSelection = MultiSelection.node.getBoundingClientRect();

					[].forEach.call($(".Move"), function(Element)
					{
						const Rect = Element.getBoundingClientRect();

						if(Rect.top + Rect.height > RectSelection.top && Rect.left + Rect.width > RectSelection.left && Rect.bottom - Rect.height < RectSelection.bottom && Rect.right && Rect.width < RectSelection.right )
						{
							Element.classList.add("Selected");
						}
						else
						{
							Element.classList.remove("Selected");
						}
					})
				})
			}
			$("body").off("mouseup").on("mouseup", function(){ $(document).off("mousedown"); $("#SelectionRectangle").remove(); });
		})
	})

	//-------------Create Furniture Rect---------------//

	function GenerateFurnitureRect(Select)
	{
		$.ajax
		({
			type: "POST",
			url: 'lib/php/actions.php',
			data: { name: Select.attr("data-id") },
			headers: {"Furniture" : "True"},
			dataType: "json",
			cache: false,
			success: function(response)
			{
				let Data = response[0];
				let NewElement = View.rect(0,0), NewGroup = View.group().attr("class","DragRectGroup").transform({x:500,y:300}).id(null), DragRect = View.group().attr("class","DragRect").id(null);

				let ElementAttrs = {height:UnitCon.D3.ToPx(Data.Depth), width:UnitCon.D3.ToPx(Data.Width), class:"Move", id:DuplicityIdRepair(Data.Identifier)}, CreatedRect;

				for(let Key in ElementAttrs) { NewElement.attr(Key,ElementAttrs[Key]); }

				NewElement.addTo(DragRect.addTo(NewGroup.addTo(FurnitureGroup)))

				//Function to generate resize buttons
				GenerateResizeButtons(NewElement, DragRect);

				//Start function to custom user resize
				Selected.Rect = NewElement.node;
				UpdateResIn(NewElement)
				CustomResize();
			}
		});
	}

	//Create Resize Button

	function GenerateResizeButtons(Rect, Group)
	{
		let DragX = Rect.bbox().width, DragY = Rect.bbox().height, ResultX, ResultY;

		let Values = ["LeftTop", "LeftBottom Height", "Left", "RightTop Width", "RightBottom Width Height", "Right Width", "Top", "Bottom Height"], y=-1;

		for(var i=0; i<=2; i++)
		{
			ResultX = DragX/i;
			if(ResultX == Infinity) ResultX=0;

			for(var x=0; x<=2; x++)
			{
				ResultY = DragY/x;
				if(ResultY == Infinity) ResultY=0;

				if(ResultX!=DragX/2 || ResultY!=DragY/2)
				{
					let NewCircle = View.circle().radius(4).id(null).cx(ResultX).cy(ResultY).attr("class",Values[y+=1]+" DragCircle").addTo(Group);
				}
			}
		}
	}

	//Create Rotate Button

	function SetRotationCircle(Rect)
	{
		$(".RotateGroup").remove();

		let Rotate = View.circle().id(null), RotateButton = View.circle().id(null), RotateGroup = View.group().id(null);
		let RectTrans = Rect.parent().transform(), RectSize = Rect.bbox();

		let X = (RectTrans.x + (RectSize.width/2 + Displacements.x) * Metric.Cos(RectTrans.rotation) - (RectSize.height/2 + Displacements.y) * Metric.Sin(RectTrans.rotation));
		let Y = (RectTrans.y + (RectSize.width/2 + Displacements.x) * Metric.Sin(RectTrans.rotation) + (RectSize.height/2 + Displacements.y) * Metric.Cos(RectTrans.rotation));

		RotateGroup.transform({ x: X, y: Y }).rotate(0).id(null).attr("class","RotateGroup");

		Rotate.radius(65).attr("class","Rotate").addTo(RotateGroup.addTo(Rect.parent(".DragRectGroup")));
		RotateButton.rotate(RectTrans.rotation).radius(10).cy(-65).attr("class","RotateButton").addTo(RotateGroup);
	}

	//-------------Resize Furniture Rect---------------//

	$(function ResizeFurniture()
	{
		$("body").on("mousedown", ".DragCircle", function(event)
		{
			let Circle = this.instance, Group = Circle.parent(), Rect = Circle.siblings()[0], Zoom = View.zoom();
			let RectBox = Rect.bbox(), RectTrans = Rect.transform(), GroupRot = Rect.parent().transform("rotation");

			Selected.Rect = Rect.node;
			UpdateResIn(Rect.node.instance);

			function GetTrans(ClassCircle){return Circle.parent().select(ClassCircle).get(0).transform(); }

			let ArrayCircle = [[GetTrans(".LeftTop"), GetTrans(".LeftBottom"), GetTrans(".Left")], [GetTrans(".RightTop"), GetTrans(".RightBottom"), GetTrans(".Right")], [GetTrans(".RightTop"), GetTrans(".LeftTop"), GetTrans(".Top")], [GetTrans(".RightBottom"), GetTrans(".LeftBottom"), GetTrans(".Bottom")]];
			let Angle = -GroupRot, LocalX, LocalY

			Displacements.x = RectTrans.x; Displacements.y = RectTrans.y;

			function ResizeHorizontal(EventX, EventY)
			{
				switch(Circle.attr("class").split(" ")[0])
				{
					case "Left": case "LeftBottom": case "LeftTop":
						LocalX = Metric.Cos(Angle) * (EventX - $(Circle.node).siblings(".Right").position().left) - Metric.Sin(Angle) * (EventY - $(Circle.node).siblings(".Right").position().top);

						Displacements.x = (LocalX / Zoom) + RectTrans.x + RectBox.width;

						Rect.width(-LocalX / Zoom).transform({x:Displacements.x});
						$.each(ArrayCircle[0], function(Index, Val){ Group.select("."+CircleClass[Index+0]).get(0).transform({x: Val.x + LocalX/Zoom + RectBox.width});})
						break;
					case "Right": case "RightBottom": case "RightTop":
						LocalX = Metric.Cos(Angle) * (EventX - $(Circle.node).siblings(".Left").position().left) - Metric.Sin(Angle) * (EventY - $(Circle.node).siblings(".Left").position().top);

						Rect.width(LocalX / Zoom);
						$.each(ArrayCircle[1], function(Index, Val){ Group.select("."+CircleClass[Index+3]).get(0).transform({x: Val.x + LocalX/Zoom - RectBox.width});})
						break;
				}
			}

			function ResizeVertical(EventX, EventY)
			{
				switch(Circle.attr("class").split(" ")[0])
				{
					case "Top": case "RightTop": case "LeftTop":
						LocalY = Metric.Sin(Angle) * (EventX - $(Circle.node).siblings(".Bottom").position().left) + Metric.Cos(Angle) * (EventY - $(Circle.node).siblings(".Bottom").position().top);

						Displacements.y = (LocalY / Zoom) + RectTrans.y + RectBox.height;

						Rect.height(-LocalY / Zoom).transform({y:Displacements.y});
						$.each(ArrayCircle[2], function(Index, Val){ Group.select("."+CircleClass[Index+6]).get(0).transform({y: Val.y + LocalY/Zoom + RectBox.height});})
						break;
					case "Bottom": case "RightBottom": case "LeftBottom":
						LocalY = Metric.Sin(Angle) * (EventX - $(Circle.node).siblings(".Top").position().left) + Metric.Cos(Angle) * (EventY - $(Circle.node).siblings(".Top").position().top);

						Rect.height(LocalY / Zoom);
						$.each(ArrayCircle[3], function(Index, Val){ Group.select("."+CircleClass[Index+9]).get(0).transform({y: Val.y + LocalY/Zoom - RectBox.height});})
						break;
				}
			}

			$(document).on("mousemove", function(event)
			{
				ResizeHorizontal(event.pageX, event.pageY);
				ResizeVertical(event.pageX, event.pageY);

				UpdateResIn(Rect.node.instance);
				SetRotationCircle(Rect);
			})
			$("body").off("mouseup").on("mouseup", function(event)
			{
				$(Rect.node).siblings(".Top, .Bottom").attr("cx", Rect.bbox().width/2 + Displacements.x); $(Rect.node).siblings(".Left, .Right").attr("cy", Rect.bbox().height/2 + Displacements.y);
			});
		})
	})

	//-------------Rotate Furniture Rect---------------//

	$(function RotationFurniture()
	{
		$("svg").on("mousedown", ".RotateButton", function(event)
		{
			let Rect = this.instance.parent(".DragRectGroup").first().first();
			let RectSize = Rect.bbox(), Rotate = SVG.select(".Rotate").get(0);

			$(document).on("mousemove", function(event)
			{
				UpdateResIn(Rect);

				let x = (event.pageX - $(".Rotate").position().left) / View.zoom() - Rotate.bbox().width/2;
				let y = (event.pageY - $(".Rotate").position().top) / View.zoom() - Rotate.bbox().height/2;
				let Degs = Metric.Atan2(y,x) + 90;

				Rotate.siblings()[1].rotate(Degs,0,0);
				Rect.parent().rotate(Degs,(RectSize.width/2 + Displacements.x),(RectSize.height/2 + Displacements.y));
			})
			$("body").off("mouseup").on("mouseup", function(event){ $(document).off("mousedown"); })
		})
	})

	//-------------User Custom Resize By Inputs---------------//

	function CustomResize()
	{
		$(".InputSize").on("change", function()
		{
			if(Validate($(this).val()) == false)
			{
				let Rect = Selected.Rect.instance, Value = UnitCon.D3.ToPx($(this).val()), RectSize = Rect.bbox();

				function CirclePos(Dir){ return Rect.parent().select(Dir).get(0).transform(); }

				switch($(this).attr("id"))
				{
					case "width":
						Selected.Rect.instance.width(Value);
						Rect.parent().select(".Width").transform({ x: CirclePos(".Width").x + Value - RectSize.width });

						$(Rect.node).siblings(".Top, .Bottom").attr("cx", Value/2 + Displacements.x);
						break;
					case "depth":
						Selected.Rect.instance.height(Value);
						Rect.parent().select(".Height").transform({ y: CirclePos(".Height").y + Value - RectSize.height });

						$(Rect.node).siblings(".Left, .Right").attr("cy", Value/2 + Displacements.y);
						break;
					case "rotate":
						Rect.parent().animate(300, '>', 0).rotate($(this).val(),(RectSize.width/2 + Displacements.x),(RectSize.height/2 + Displacements.y));
						SVG.select(".Rotate").get(0).rotate($(this).val(),0,0);
						break;
				}
				SetRotationCircle(Rect);
			}
		})
	}

	//-------------Updates Custom Resize Inputs---------------//

	function UpdateResIn(Rect)
	{
		$("#width").val(Math.round(UnitCon.D3.ToCm(Rect.width())*100)/100);
		$("#height").val("");
		$("#depth").val(Math.round(UnitCon.D3.ToCm(Rect.height())*100)/100);
		$("#rotate").val(Math.round(Rect.parent().transform("rotation")));
	}

	//-------------Generate Custom Path---------------//

	/*$(function RenderPathWall()
	{
		let Radius = 10, Deep = 20;

		$("body").on("click", function(event)
		{
			const MathEdges = [];
			const Paths = View.group().id(null).attr("class","WallPath");
			MainGroup.add(PathGroup.add(Paths));

			for(let i = 0; i <= 3; i++) { MathEdges.push(View.circle(5).fill("green").id(null).attr("class","MathEdge")); }

			let Wall = View.path().stroke("red").fill("none").id("WallIdent").attr("class","Wall");
			let Circle = View.circle().stroke("blue").fill("none").id(null).attr("class","ConnectWall").radius(Radius);
			Paths.add(Wall);

			let StartX = event.pageX, StartY = event.pageY;
			Wall.transform({x:event.pageX,y:event.pageY}); Circle.transform({x:event.pageX,y:event.pageY});

			let SecondSegment = 0, SecondSegment2 = 0, ThirdSegment = 0, ThirdSegment2 = 0;
			let PenultimateWall, LastWall;

			if($(".Wall").length >= 2)
			{
				PenultimateWall = SVG.select(".WallPath").last().previous().first();
				LastWall = SVG.select(".WallPath").last().first();

				SecondSegment = PenultimateWall.getSegment(1);
				ThirdSegment = PenultimateWall.getSegment(2);
		 	}

			$(document).on("mousemove", function(event)
			{
				let x = event.pageX - $(".ConnectWall").last().position().left - SVG.select(".ConnectWall").last().bbox().width/2;
				let y = event.pageY - $(".ConnectWall").last().position().top - SVG.select(".ConnectWall").last().bbox().width/2;

				let Degs = Metric.Atan2(y,x) + 90, Cos = Metric.Cos(Degs) * Radius, Sin = Metric.Sin(Degs) * Radius;

				let MVec = Vectors.Vector([StartX, StartY], [event.pageX, event.pageY]), VectorLenght = Vectors.Lenght(MVec[0], MVec[1]);
				let Vx = (MVec[0] / VectorLenght), Vy = (MVec[1] / VectorLenght);

				Wall.clearPath();
				Wall
					.M ({ x: Cos, y: Sin})
					.L ({ x: MVec[0] + Cos, y: MVec[1] + Sin})
					.L ({ x: MVec[0] + (Vy * Deep) + Cos, y: MVec[1] + (-Vx * Deep) + Sin})
					.L ({ x: Vy * Deep + Cos, y: -Vx * Deep + Sin })
					.Z();

				const AttributeArray = [
					[(Cos+StartX), (Sin+StartY)],
					[(MVec[0] + Cos+StartX), (MVec[1] + Sin+StartY)],
					[(MVec[0] + (Vy * Deep) + Cos+StartX), (MVec[1] + (-Vx * Deep) + Sin+StartY)],
					[(Vy * Deep + Cos+StartX), (-Vx * Deep+ Sin+StartY)]
				];

				for(let x = 0; x <= 3; x++) { Paths.add(MathEdges[x].cx(AttributeArray[x][0]).cy(AttributeArray[x][1])); }

				if($(".ConnectWall").length > 1)
				{
					const Last = SVG.select(".WallPath").last().children();
					const Penultimate = SVG.select(".WallPath").last().previous().children();
					let SubA, SubB, NewSegment;

					let SecondSegment2 = LastWall.getSegment(0);
					let ThirdSegment2 = LastWall.getSegment(3);

					const FirstIntersection = Intersection(Last[1].cx(), Last[1].cy(), Last[2].cx(), Last[2].cy(), Penultimate[1].cx(), Penultimate[1].cy(), Penultimate[2].cx(), Penultimate[2].cy());
					const SecondIntersection = Intersection(Last[4].cx(), Last[4].cy(), Last[3].cx(), Last[3].cy(), Penultimate[3].cx(), Penultimate[3].cy(), Penultimate[4].cx(), Penultimate[4].cy());

					const PathEdges = [
						[ [ Penultimate[2], FirstIntersection, SecondSegment, "M", PenultimateWall, 1 ], [ Last[1], FirstIntersection, SecondSegment2, "M", LastWall, 0 ] ], //First Line;
						[ [ Penultimate[3], SecondIntersection, ThirdSegment, "L", PenultimateWall, 2 ], [ Last[4], SecondIntersection, ThirdSegment2, "L", LastWall, 3 ] ]//SecondLine
					]

					for(let F = 0; F <= 1; F++)
					{
						for(let S = 0; S <= 1; S++)
						{
							SubA = PathEdges[F][S][0].cx() - PathEdges[F][S][1].x;
							SubB = PathEdges[F][S][0].cy() - PathEdges[F][S][1].y;

							NewSegment = { coords: [PathEdges[F][S][2].coords[0] - SubA , PathEdges[F][S][2].coords[1] - SubB], type: PathEdges[F][S][3] };

							PathEdges[F][S][4].replaceSegment(PathEdges[F][S][5], NewSegment);
						}
					}
				}
			})
		})
	})*/

	//-------------Intersection---------------//

	function Intersection(x1, y1, x2, y2, x3, y3, x4, y4)
 	{
    	let Denominator, a, b, Numerator1, Numerator2, Result =
		{
        	x: null,
        	y: null
    	};

		Denominator = ((y4 - y3) * (x2 - x1)) - ((x4 - x3) * (y2 - y1));
    	if(Denominator == 0) return Result;

    	a = y1 - y3;
    	b = x1 - x3;

		Numerator1 = ((x4 - x3) * a) - ((y4 - y3) * b);
    	Numerator2 = ((x2 - x1) * a) - ((y2 - y1) * b);

		a = Numerator1 / Denominator;
    	b = Numerator2 / Denominator;

    	Result.x = x1 + (a * (x2 - x1));
    	Result.y = y1 + (a * (y2 - y1));

    	return Result;
	};

	//-------------Generate Mesh Menu---------------//

	function GenerateListOfMesh(Type)
	{
		$.ajax
		({
			type: "POST",
			method: "POST",
			url: 'lib/php/actions.php',
			dataType: "json",
			data: { type: Type },
			headers: {"Generate" : "Get_List"},
			cache: false,
			success: function(response)
			{
				$("#List").append("<div id='ListTitle'><span>"+Translate(Type)+"</span></div>"+"<ul></ul>");

				$(response).each(function()
				{
					let Data = $(this)[0];

					$("#List ul").append
					(
						`<li data-id='${Data.Identifier}' class='ListItem'>
							<div class='ListImg'>
								<div class='NameOfMesh'><span>${Data.Name}</span></div>
								<img width='130' height='130' src='img/${Data.Source}.jpg' draggable='false'>
								<svg xmlns="http://www.w3.org/2000/svg" fill="white" width="18" height="18" viewBox="0 0 24 24"><path d="M21.172 24l-7.387-7.387c-1.388.874-3.024 1.387-4.785 1.387-4.971 0-9-4.029-9-9s4.029-9 9-9 9 4.029 9 9c0 1.761-.514 3.398-1.387 4.785l7.387 7.387-2.828 2.828zm-12.172-8c3.859 0 7-3.14 7-7s-3.141-7-7-7-7 3.14-7 7 3.141 7 7 7z"/></svg>
							</div>

							<div class='ListDesc'>
								<span>Šířka: ${Data.Width} cm</span>
								<span>Výška: ${Data.Height} cm</span>
								<span>Hloubka: ${Data.Depth} cm</span>
							</div>
						</li>`
					);
				});


				$("#List").append("<div id='ListActionMenu'>"+
					"<div id='ListNext'>"+
						'<svg width="17" height="17" fill="white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M20 .755l-14.374 11.245 14.374 11.219-.619.781-15.381-12 15.391-12 .609.755z"/></svg>'+
						"<span id='NumberSite'>1 / 1</span>"+
						'<svg width="17" height="17" fill="white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M20 .755l-14.374 11.245 14.374 11.219-.619.781-15.381-12 15.391-12 .609.755z"/></svg>'+
					"</div>"+
						"<div id='Filtr'>"+
							"<span>Filtry:</span>"+
						"</div>"+
					"</div>"+

					"<div id='IncreaseButton'>"+
						"<span>Zobrazení</span>"+
						"<div id='ListIncrease'>"+
							"<input type='checkbox' id='SwitchList' value='1' />"+
							"<label for='SwitchList'></label>"+
						"</div>"+
					"</div>"
				);
			}
		})

		setTimeout(function()
		{
			$.ajax
			({
				type: "POST",
				method: "POST",
				url: 'lib/php/actions.php',
				dataType: "json",
				data: { type: Type },
				headers: {"Filtr" : "True"},
				cache: false,
				success: function(response)
				{
					if(response.length == 0){$("#Filtr").append("<span>Žádné dostupné filtry</span>")}

					let	Counter = 0;
					$(response).each(function()
					{
						Counter++;
						let Data = $(this)[0];

						$("#Filtr").append("<div class='Filtrs'><input type='checkbox' id='RadioFiltrs_"+Counter+"' /><label for='RadioFiltrs_"+Counter+"'>"+Data.SubType+"</label></div>");
					})
				}
			})
		}, 300);
	}

	//-------------Animations---------------//

	//Furniture list

	function EmptyList(NodesOfList)
	{
		$("#FurnitureList").children().empty();

		$("#ListButton").toggleClass('ActiveList');
		$("#List").animate({ width: "0", height: "44vh", marginTop: "-22vh" }, 300, function() {});
		$("#FurnitureList").animate({ left: "0" }, 300, function()
		{
			if($("#List").is(':empty'))
			{
				for (var i = 0; i < NodesOfList.length; i++)
				{
					$("#List")[0].appendChild(NodesOfList[i])
				}
			}
			$("#List").css({"display":"none"});
		});
	}

	$(function OpenListMenu()
	{
		$("body").on("click", "#ListButton", function()
		{
			if($("#ListButton").attr("class") != "ActiveList")
			{
				$("#ListButton").toggleClass('ActiveList');
				$("#List").css({"display":"flex", "opacity":"0.9"});
				$("#List").animate({ width: "+=9vw" }, 300, function() {});
				$("#FurnitureList").animate({ left: "9vw" }, 300, function() {});
			}
			else
			{
				EmptyList(NodesToArray);
			}
		})

		$("body").on("click", ".ListSelect", function()
		{
			$("#FurnitureList").children().empty();

			if($("#List").attr("class") != "ActiveMesh")
			{
				GenerateListOfMesh($(this).attr("id"));

				$("#List").css({"opacity":"1"});
				$("#List").animate({ width: "+=12vw", height: "+=37.5vh", marginTop: "-=15vh" }, 300, function() {});
				$("#FurnitureList").animate({ left: "21vw" }, 300, function() { $("#ListOfMesh").toggleClass("ActiveMesh"); });
			}
		})
	})

	$(".RadioSelection").on("click", function()
	{
		if($(this).is(":checked"))
		{
			$(".CheckedButton").css({"background-color":"#333"});
			$(this).closest(".SelectionMenu").find(".CheckedButton").css({"background-color":"#0459AB"});
		}

		switch($(this).attr("id"))
		{
			case "MouseSelection":
				Enables.GridMove = false;
				break;
			case "MouseMovement":
				Enables.GridMove = true;
				break;
		}
	})

	//-------------Translate---------------//

	function Translate(Word)
	{
		switch (Word)
		{
			case "Kitchen":
				return "Kuchyňský nábytek";
			case "Interior":
				return "Interiový nábytek";
			case "Wardrobe":
				return "Vestavěné skříně";
			default: "Přeložit!!";
			break;
		}
	}

	//-------------Usefull Functions---------------//

	//Repair duplicity id
	function DuplicityIdRepair(Identificator)
	{
		if($("#" + Identificator).length != 0)
		{
			let LastElement = []
			$(".Move").each(function()
			{
				let Name = $(this).attr("id").replace(/[^A-Z a-z]/g, '');

				if(Name == Identificator.replace(/[^A-Z a-z]/g, ''))
				{
					LastElement.push($(this));
				}
			})

			let Counter =  parseFloat(LastElement.pop().attr("id").replace(/[^0-9]/g, 0))+1;
			var NewIdentificator = Identificator.replace(/[^a-zA-Z]/g, '') + Counter
		}
		else{ var NewIdentificator = Identificator }

		return NewIdentificator;
	}

	//Vectors
	const Vectors =
	{
		Vector: function(MatrixA, MatrixB) { return [ (MatrixB[0] - MatrixA[0]), (MatrixB[1] - MatrixA[1]) ]; },

		Lenght: function(VectorX, VectorY) { return Math.sqrt(Math.pow(VectorX,2) + Math.pow(VectorY,2)); }
	}

	//Goniometric functions
	const Metric =
	{
		Radius: 180,
		Cos: function(Rotate) { return Math.cos(Math.PI * Rotate / this.Radius) },
		Sin: function(Rotate) { return Math.sin(Math.PI * Rotate / this.Radius) },
		Atan2: function(AngleY, AngleX) { return Math.atan2(AngleY,AngleX)*(this.Radius/Math.PI) }
	};

	//Unit Conversion
	const UnitCon =
	{
		D3:
			{
				Dpi: 96,
				Inch: 2.54,
				Scale: 0.002,

				ToPx: function(Value) { return ((Value*this.Dpi)/this.Inch)*this.Scale; },
				ToCm: function(Value) { return ((Value/this.Dpi)*this.Inch)/this.Scale; }
			}

		/*D2:
			{
				ToM:
				ToCm:
				ToDm:
				ToMm:
			}*/
	};

	//Input Validation

	function Validate(Input)
	{
		let RemoveSpace = Input.replace(/\s/g, ''), Error = false;

		if(RemoveSpace.length != 0)
		{
			if(new RegExp('^[0-9\-]+$').test(RemoveSpace) == true )
			{
				if((RemoveSpace.match(/-/g) || []).length > 1) Error = "Více záporných znamínek";
			}
			else Error = "Nepovolené znaky";
		}
		else Error = "Nevyplněnné pole";

		return Error;
	}

	//-------------On Function Starting---------------//

	$("body").on("mousedown", ".ListItem", function()
	{
		GenerateFurnitureRect($(this));

		$("body").off("mouseup").on("mouseup", function() {$(document).off("mousedown"); })
	})

	$(function ShowZoomNumber()
	{
		$("#Zoom").on("input", function()
		{
			$("#ZoomDisplay span").text("Přiblížení - "+Math.round(View.zoom()*100)/100 + "x");
		})
		View.on('zoom', function() { $("#ZoomDisplay span").text("Přiblížení - "+Math.round(View.zoom()*100)/100 + "x"); })
	})
}
