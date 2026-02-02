import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-links',
  imports: [RouterLink],
  templateUrl: './links.html',
  styleUrl: '../styles.css'
})
export class Links {
  constructor() { }
}