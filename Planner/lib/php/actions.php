<?php
	require_once("connect.php");
	
	if($_SERVER['REQUEST_METHOD'] == "POST")
	{
		if (isset($_SERVER['HTTP_GENERATE']))
		{
			$Prepare = $db->prepare('SELECT * FROM furniture INNER JOIN img ON furniture.Img = img.ID INNER JOIN type ON type.ID = furniture.Type WHERE type.type = ? ');
			$Prepare->execute(array($_POST["type"]));
			$Furniture = $Prepare->fetchAll(PDO::FETCH_ASSOC);
	
			echo json_encode($Furniture);
		}
		
		else if (isset($_SERVER['HTTP_FILTR']))
		{
			$Prepare = $db->prepare('SELECT * FROM subtype INNER JOIN type ON type.id = subtype.TypeID WHERE type.type = ? ');
			$Prepare->execute(array($_POST["type"]));
			$Filtr = $Prepare->fetchAll(PDO::FETCH_ASSOC);
	
			echo json_encode($Filtr);
		}
		
		else if (isset($_SERVER['HTTP_FURNITURE']))
		{
			$Prepare = $db->prepare('SELECT * FROM furniture WHERE Identifier=?');
			$Prepare->execute(array($_POST["name"]));
			$GetFurniture = $Prepare->fetchAll(PDO::FETCH_ASSOC);
		
			echo json_encode($GetFurniture);
		}
	}
	
	header('Content-Type: application/json');
?>